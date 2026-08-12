import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('daily_questions')
export class DailyQuestion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // English is the baseline version — these columns predate multilingual
  // support, so every existing row already has them populated.
  @Column()
  subject: string;

  @Column({ type: 'text', name: 'question_text' })
  questionText: string;

  @Column({ name: 'correct_answer' })
  correctAnswer: string;

  // French and Creole versions of the same question. Nullable so existing
  // rows (created before multilingual support) don't need a backfill —
  // they simply fall back to the English text above when a translation
  // is missing (see ContestService.resolveLocalized).
  @Column({ name: 'subject_fr', nullable: true })
  subjectFr?: string;

  @Column({ type: 'text', name: 'question_text_fr', nullable: true })
  questionTextFr?: string;

  @Column({ name: 'correct_answer_fr', nullable: true })
  correctAnswerFr?: string;

  @Column({ name: 'subject_ht', nullable: true })
  subjectHt?: string;

  @Column({ type: 'text', name: 'question_text_ht', nullable: true })
  questionTextHt?: string;

  @Column({ name: 'correct_answer_ht', nullable: true })
  correctAnswerHt?: string;

  // Set once the first correct answer lands — locks the question.
  @Column({ name: 'winner_contestant_id', nullable: true })
  winnerContestantId?: string;

  @Column({ name: 'winner_name', nullable: true })
  winnerName?: string;

  @Column({ name: 'answered_at', type: 'timestamptz', nullable: true })
  answeredAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
