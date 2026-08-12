import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contestant } from './contestant.entity';
import { DailyQuestion } from './daily-question.entity';
import { QuestionAttempt } from './question-attempt.entity';
import { MonthlyWinner } from './monthly-winner.entity';
import { ContestSettings } from './contest-settings.entity';
import { SubscribeContestantDto } from './dto/subscribe-contestant.dto';
import { CreateQuestionDto } from './dto/create-question.dto';
import { SubmitAnswerDto } from './dto/submit-answer.dto';

const FIRST_CORRECT_POINTS = 10;
const CLOSED_MESSAGE = 'This month\'s contest has ended — the admin needs to reset it before a new one can start.';

type ContestLanguage = 'en' | 'fr' | 'ht';

function currentPeriodMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// Case/whitespace/accent-insensitive comparison so "Inde", "inde", "  INDE "
// and "Índe" all match — contestants shouldn't lose points to typos in
// capitalization or accents.
function normalizeAnswer(value: string): string {
  const stripped = Array.from(value.normalize('NFD'))
    .filter((ch) => {
      const code = ch.codePointAt(0) ?? 0;
      return code < 0x0300 || code > 0x036f; // drop combining diacritical marks
    })
    .join('');
  return stripped.trim().toLowerCase().replace(/\s+/g, ' ');
}

function localizedField(
  question: DailyQuestion,
  base: 'subject' | 'questionText' | 'correctAnswer',
  language: ContestLanguage,
): string {
  if (language === 'en') return question[base];
  const key = (base + (language === 'fr' ? 'Fr' : 'Ht')) as keyof DailyQuestion;
  return (question[key] as string | undefined) || question[base];
}

// Number of days in a "YYYY-MM" period — the monthly point goal is this many
// days times the daily first-correct-answer bonus.
function daysInPeriod(periodMonth: string): number {
  const [year, month] = periodMonth.split('-').map(Number);
  return new Date(year, month, 0).getDate();
}

export interface LeaderboardResult {
  goal: number;
  periodEnded: boolean;
  monthWinner?: { name: string; imageUrl: string; points: number };
  contestants: Contestant[];
}

@Injectable()
export class ContestService {
  constructor(
    @InjectRepository(Contestant)
    private readonly contestantsRepo: Repository<Contestant>,
    @InjectRepository(DailyQuestion)
    private readonly questionsRepo: Repository<DailyQuestion>,
    @InjectRepository(QuestionAttempt)
    private readonly attemptsRepo: Repository<QuestionAttempt>,
    @InjectRepository(MonthlyWinner)
    private readonly monthlyWinnersRepo: Repository<MonthlyWinner>,
    @InjectRepository(ContestSettings)
    private readonly settingsRepo: Repository<ContestSettings>,
  ) {}

  // Creates the settings row on first-ever use. Does NOT auto-roll the
  // period — once a month ends, the contest stays closed until an admin
  // explicitly resets it (see resetContest()).
  private async getSettings(): Promise<ContestSettings> {
    let settings = await this.settingsRepo.findOne({ where: { id: 1 } });
    if (!settings) {
      settings = this.settingsRepo.create({ id: 1, currentPeriodMonth: currentPeriodMonth() });
      await this.settingsRepo.save(settings);
    }
    return settings;
  }

  private isPeriodEnded(settings: ContestSettings): boolean {
    return settings.currentPeriodMonth !== currentPeriodMonth();
  }

  async subscribe(dto: SubscribeContestantDto): Promise<Contestant> {
    const settings = await this.getSettings();
    if (this.isPeriodEnded(settings)) throw new ForbiddenException(CLOSED_MESSAGE);

    const email = dto.email.toLowerCase();
    const existing = await this.contestantsRepo.findOne({ where: { email } });
    if (existing) return existing;

    const contestant = this.contestantsRepo.create({
      name: dto.name,
      email,
      phone: dto.phone,
      imageUrl: dto.imageUrl,
    });
    return this.contestantsRepo.save(contestant);
  }

  async getLeaderboard(): Promise<LeaderboardResult> {
    const settings = await this.getSettings();
    const periodEnded = this.isPeriodEnded(settings);
    const contestants = await this.contestantsRepo.find({
      order: { points: 'DESC', createdAt: 'ASC' },
    });

    let monthWinner: LeaderboardResult['monthWinner'];
    if (periodEnded) {
      const [leader] = contestants;
      if (leader && leader.points > 0) {
        monthWinner = { name: leader.name, imageUrl: leader.imageUrl, points: leader.points };
      }
    }

    return {
      goal: daysInPeriod(settings.currentPeriodMonth) * FIRST_CORRECT_POINTS,
      periodEnded,
      monthWinner,
      contestants,
    };
  }

  async getCurrentQuestion(language: ContestLanguage = 'en'): Promise<{
    id: string;
    subject: string;
    questionText: string;
    answered: boolean;
    winnerName?: string;
  } | null> {
    const settings = await this.getSettings();
    if (this.isPeriodEnded(settings)) return null;

    const question = await this.getLatestQuestion();
    if (!question) return null;

    return {
      id: question.id,
      subject: localizedField(question, 'subject', language),
      questionText: localizedField(question, 'questionText', language),
      answered: !!question.winnerContestantId,
      winnerName: question.winnerName,
    };
  }

  async submitAnswer(dto: SubmitAnswerDto): Promise<{ correct: boolean; won: boolean; points: number }> {
    const settings = await this.getSettings();
    if (this.isPeriodEnded(settings)) throw new ForbiddenException(CLOSED_MESSAGE);

    const email = dto.email.toLowerCase();

    const contestant = await this.contestantsRepo.findOne({ where: { email } });
    if (!contestant) {
      throw new NotFoundException('Subscribe to the contest before answering.');
    }

    const question = await this.getLatestQuestion();
    if (!question) {
      throw new NotFoundException("There's no active question right now.");
    }

    const existingAttempt = await this.attemptsRepo.findOne({
      where: { questionId: question.id, contestantId: contestant.id },
    });
    if (existingAttempt) {
      throw new ConflictException("You've already answered today's question.");
    }

    // Accept a match against any of the three stored language versions —
    // a contestant browsing in English can still answer in French or Creole.
    const submitted = normalizeAnswer(dto.answer);
    const acceptedAnswers = [question.correctAnswer, question.correctAnswerFr, question.correctAnswerHt]
      .filter((a): a is string => !!a)
      .map(normalizeAnswer);
    const isCorrect = acceptedAnswers.includes(submitted);

    await this.attemptsRepo.save(
      this.attemptsRepo.create({
        questionId: question.id,
        contestantId: contestant.id,
        submittedAnswer: dto.answer,
        isCorrect,
      }),
    );

    if (!isCorrect) {
      return { correct: false, won: false, points: contestant.points };
    }

    // Atomic race: only the first correct answer claims the question.
    const result = await this.questionsRepo
      .createQueryBuilder()
      .update()
      .set({
        winnerContestantId: contestant.id,
        winnerName: contestant.name,
        answeredAt: new Date(),
      })
      .where('id = :id', { id: question.id })
      .andWhere('winner_contestant_id IS NULL')
      .execute();

    const won = (result.affected ?? 0) > 0;
    if (won) {
      contestant.points += FIRST_CORRECT_POINTS;
      await this.contestantsRepo.save(contestant);
    }

    return { correct: true, won, points: contestant.points };
  }

  async getHistory(): Promise<MonthlyWinner[]> {
    return this.monthlyWinnersRepo.find({ order: { createdAt: 'DESC' } });
  }

  private async getLatestQuestion(): Promise<DailyQuestion | null> {
    const [question] = await this.questionsRepo.find({
      order: { createdAt: 'DESC' },
      take: 1,
    });
    return question ?? null;
  }

  // Admin only. Blocked once the period has ended — reset is the only way
  // to start a new one.
  async createQuestion(dto: CreateQuestionDto): Promise<DailyQuestion> {
    const settings = await this.getSettings();
    if (this.isPeriodEnded(settings)) throw new ForbiddenException(CLOSED_MESSAGE);

    const question = this.questionsRepo.create({
      subject: dto.subjectEn,
      questionText: dto.questionTextEn,
      correctAnswer: dto.correctAnswerEn,
      subjectFr: dto.subjectFr,
      questionTextFr: dto.questionTextFr,
      correctAnswerFr: dto.correctAnswerFr,
      subjectHt: dto.subjectHt,
      questionTextHt: dto.questionTextHt,
      correctAnswerHt: dto.correctAnswerHt,
    });
    return this.questionsRepo.save(question);
  }

  async listQuestionsForAdmin(): Promise<DailyQuestion[]> {
    return this.questionsRepo.find({ order: { createdAt: 'DESC' } });
  }

  async listContestantsForAdmin(): Promise<Contestant[]> {
    return this.contestantsRepo.find({ order: { points: 'DESC', createdAt: 'ASC' } });
  }

  // Admin only: archives the current leader as the winner of the period
  // that's ending, then wipes every contestant, question, and attempt so a
  // fresh contest can start. Past monthly winners are kept as history.
  async resetContest(): Promise<void> {
    const settings = await this.getSettings();

    const [leader] = await this.contestantsRepo.find({ order: { points: 'DESC' }, take: 1 });
    if (leader && leader.points > 0) {
      await this.monthlyWinnersRepo.save(
        this.monthlyWinnersRepo.create({
          periodMonth: settings.currentPeriodMonth,
          contestantName: leader.name,
          contestantImageUrl: leader.imageUrl,
          points: leader.points,
        }),
      );
    }

    await this.attemptsRepo.createQueryBuilder().delete().execute();
    await this.questionsRepo.createQueryBuilder().delete().execute();
    await this.contestantsRepo.createQueryBuilder().delete().execute();

    settings.currentPeriodMonth = currentPeriodMonth();
    await this.settingsRepo.save(settings);
  }
}
