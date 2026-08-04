import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Registration } from './registration.entity';
import { RegistrationsService } from './registrations.service';
import { RegistrationsController } from './registrations.controller';
import { ClassesModule } from '../classes/classes.module';

@Module({
  imports: [TypeOrmModule.forFeature([Registration]), ClassesModule],
  controllers: [RegistrationsController],
  providers: [RegistrationsService],
})
export class RegistrationsModule {}
