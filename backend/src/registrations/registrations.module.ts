import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Registration } from './registration.entity';
import { RegistrationsService } from './registrations.service';
import { RegistrationsController } from './registrations.controller';
import { AdminRegistrationsController } from './admin-registrations.controller';
import { ClassesModule } from '../classes/classes.module';
import { SubmissionsModule } from '../submissions/submissions.module';
import { ProgressModule } from '../progress/progress.module';

@Module({
  imports: [TypeOrmModule.forFeature([Registration]), ClassesModule, SubmissionsModule, ProgressModule],
  controllers: [RegistrationsController, AdminRegistrationsController],
  providers: [RegistrationsService],
})
export class RegistrationsModule {}
