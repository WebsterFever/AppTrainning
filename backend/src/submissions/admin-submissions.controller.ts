import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { SubmissionsService } from './submissions.service';
import { ReviewSubmissionDto } from './dto/review-submission.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

// Admin only: review module project submissions across every class.
@UseGuards(JwtAuthGuard)
@Controller('admin/submissions')
export class AdminSubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Get()
  listAll() {
    return this.submissionsService.listAll();
  }

  @Patch(':id/review')
  review(@Param('id') id: string, @Body() dto: ReviewSubmissionDto) {
    return this.submissionsService.review(id, dto);
  }
}
