import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Registration } from '../../registrations/registration.entity';
import { ClassesModule } from '../classes.module';
import { SubmissionsModule } from '../../submissions/submissions.module';
import { UploadsModule } from '../../uploads/uploads.module';
import { AiTeacherService } from './ai-teacher.service';
import { AiTeacherController } from './ai-teacher.controller';
import { AdminAiTeacherController } from './admin-ai-teacher.controller';
import { OpenAiTtsProvider } from './openai-tts.provider';

@Module({
  imports: [TypeOrmModule.forFeature([Registration]), ClassesModule, SubmissionsModule, UploadsModule],
  controllers: [AiTeacherController, AdminAiTeacherController],
  providers: [AiTeacherService, OpenAiTtsProvider],
})
export class AiTeacherModule {}
