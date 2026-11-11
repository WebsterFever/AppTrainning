import { Controller, Delete, Body, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
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

  @Patch('questions/:id')
  updateQuestion(@Param('id') id: string, @Body() dto: CreateQuestionDto) {
    return this.contestService.updateQuestion(id, dto);
  }

  @Delete('questions/:id')
  deleteQuestion(@Param('id') id: string) {
    return this.contestService.deleteQuestion(id);
  }

  @Get('questions')
  listQuestions() {
    return this.contestService.listQuestionsForAdmin();
  }

  @Get('contestants')
  listContestants() {
    return this.contestService.listContestantsForAdmin();
  }

  @Delete('reset')
  reset() {
    return this.contestService.resetContest();
  }
}
