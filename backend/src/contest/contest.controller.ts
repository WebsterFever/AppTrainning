import { Body, Controller, Get, Post } from '@nestjs/common';
import { ContestService, POINTS_GOAL } from './contest.service';
import { SubscribeContestantDto } from './dto/subscribe-contestant.dto';
import { SubmitAnswerDto } from './dto/submit-answer.dto';

@Controller('contest')
export class ContestController {
  constructor(private readonly contestService: ContestService) {}

  @Post('subscribe')
  subscribe(@Body() dto: SubscribeContestantDto) {
    return this.contestService.subscribe(dto);
  }

  @Get('leaderboard')
  async leaderboard() {
    const contestants = await this.contestService.getLeaderboard();
    return {
      goal: POINTS_GOAL,
      contestants: contestants.map((c) => ({
        id: c.id,
        name: c.name,
        imageUrl: c.imageUrl,
        points: c.points,
        subscribedAt: c.createdAt,
      })),
    };
  }

  @Get('question')
  question() {
    return this.contestService.getCurrentQuestion();
  }

  @Post('answer')
  answer(@Body() dto: SubmitAnswerDto) {
    return this.contestService.submitAnswer(dto);
  }

  @Get('history')
  history() {
    return this.contestService.getHistory();
  }
}
