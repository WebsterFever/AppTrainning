import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrainingClass } from './class.entity';
import { ClassesService } from './classes.service';
import { ClassesController } from './classes.controller';
import { AdminClassesController } from './admin-classes.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TrainingClass])],
  controllers: [ClassesController, AdminClassesController],
  providers: [ClassesService],
  exports: [ClassesService],
})
export class ClassesModule {}
