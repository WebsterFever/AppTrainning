import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Registration } from '../../registrations/registration.entity';
import { SubmissionsModule } from '../../submissions/submissions.module';
import { CourseAccessService } from './course-access.service';

@Module({
  imports: [TypeOrmModule.forFeature([Registration]), SubmissionsModule],
  providers: [CourseAccessService],
  exports: [CourseAccessService],
})
export class CourseAccessModule {}
