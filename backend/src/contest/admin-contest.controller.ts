import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ContestService } from './contest.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('admin/contest')
export class AdminContestController {
  constructor(private readonly contestService: ContestService) {}

  @Post('questions')
  createQuestion(@Body() dto: CreateQuestionDto) {
    return this.contestService.createQuestion(dto);
  }

  @Get('questions')
  listQuestions() {
    return this.contestService.listQuestionsForAdmin();
  }

  @Get('contestants')
  listContestants() {
    return this.contestService.listContestantsForAdmin();
  }
}
