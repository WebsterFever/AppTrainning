import { Module } from '@nestjs/common';
import { ClassesModule } from '../classes.module';
import { CourseAccessModule } from '../course-access/course-access.module';
import { UploadsModule } from '../../uploads/uploads.module';
import { AiTeacherService } from './ai-teacher.service';
import { AiTeacherController } from './ai-teacher.controller';
import { AdminAiTeacherController } from './admin-ai-teacher.controller';
import { OpenAiTtsProvider } from './openai-tts.provider';

@Module({
  imports: [ClassesModule, CourseAccessModule, UploadsModule],
  controllers: [AiTeacherController, AdminAiTeacherController],
  providers: [AiTeacherService, OpenAiTtsProvider],
})
export class AiTeacherModule {}
