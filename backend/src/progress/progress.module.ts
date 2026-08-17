import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubtopicProgress } from './subtopic-progress.entity';
import { ProgressService } from './progress.service';
import { ProgressController } from './progress.controller';
import { ClassesModule } from '../classes/classes.module';
import { CourseAccessModule } from '../classes/course-access/course-access.module';

@Module({
  imports: [TypeOrmModule.forFeature([SubtopicProgress]), ClassesModule, CourseAccessModule],
  controllers: [ProgressController],
  providers: [ProgressService],
  exports: [ProgressService],
})
export class ProgressModule {}
