import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudentActivity } from './student-activity.entity';
import { Registration } from '../registrations/registration.entity';
import { TrainingClass } from '../classes/class.entity';
import { SubtopicProgress } from '../progress/subtopic-progress.entity';
import { ActivityService } from './activity.service';
import { ActivityController, AdminActivityController } from './activity.controller';

@Module({
  imports: [TypeOrmModule.forFeature([StudentActivity, Registration, TrainingClass, SubtopicProgress])],
  controllers: [ActivityController, AdminActivityController],
  providers: [ActivityService],
})
export class ActivityModule {}
