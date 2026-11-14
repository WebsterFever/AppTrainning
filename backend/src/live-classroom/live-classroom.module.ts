import { Module } from '@nestjs/common';
import { ClassesModule } from '../classes/classes.module';
import { LiveClassroomController } from './live-classroom.controller';
import { LiveClassroomService } from './live-classroom.service';

@Module({
  imports: [ClassesModule],
  controllers: [LiveClassroomController],
  providers: [LiveClassroomService],
})
export class LiveClassroomModule {}
