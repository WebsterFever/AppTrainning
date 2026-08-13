import { Body, Controller, Param, Post } from '@nestjs/common';
import { SubmissionsService } from './submissions.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';

@Controller('classes/:classId/modules/:moduleId/submissions')
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Post()
  submit(
    @Param('classId') classId: string,
    @Param('moduleId') moduleId: string,
    @Body() dto: CreateSubmissionDto,
  ) {
    return this.submissionsService.submit(classId, moduleId, dto);
  }
}
