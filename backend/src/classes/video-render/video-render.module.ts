import { Module } from '@nestjs/common';
import { ClassesModule } from '../classes.module';
import { CourseAccessModule } from '../course-access/course-access.module';
import { UploadsModule } from '../../uploads/uploads.module';
import { VideoRenderService } from './video-render.service';
import { VideoRenderController } from './video-render.controller';
import { AdminVideoRenderController } from './admin-video-render.controller';

@Module({
  imports: [ClassesModule, CourseAccessModule, UploadsModule],
  controllers: [VideoRenderController, AdminVideoRenderController],
  providers: [VideoRenderService],
})
export class VideoRenderModule {}
