import { Body, Controller, Param, Post } from '@nestjs/common';
import { ProgressService } from './progress.service';
import { CompleteSubtopicDto } from './dto/complete-subtopic.dto';

// Public route, same pattern as SubmissionsController — not actually
// unauthenticated in effect, since markComplete independently re-verifies
// registration + module-unlock server-side before writing anything.
@Controller('classes/:classId/subtopics/:subtopicId')
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Post('complete')
  async complete(
    @Param('classId') classId: string,
    @Param('subtopicId') subtopicId: string,
    @Body() dto: CompleteSubtopicDto,
  ) {
    const completedSubtopicIds = await this.progressService.markComplete(classId, subtopicId, dto.email);
    return { completedSubtopicIds };
  }
}
