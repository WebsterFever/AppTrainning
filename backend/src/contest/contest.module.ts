import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Contestant } from './contestant.entity';
import { DailyQuestion } from './daily-question.entity';
import { QuestionAttempt } from './question-attempt.entity';
import { MonthlyWinner } from './monthly-winner.entity';
import { ContestSettings } from './contest-settings.entity';
import { ContestService } from './contest.service';
import { ContestController } from './contest.controller';
import { AdminContestController } from './admin-contest.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Contestant,
      DailyQuestion,
      QuestionAttempt,
      MonthlyWinner,
      ContestSettings,
    ]),
  ],
  controllers: [ContestController, AdminContestController],
  providers: [ContestService],
})
export class ContestModule {}
