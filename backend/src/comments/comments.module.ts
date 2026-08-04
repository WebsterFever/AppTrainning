import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VideoComment } from './comment.entity';
import { Registration } from '../registrations/registration.entity';
import { CommentsService } from './comments.service';
import { CommentsController } from './comments.controller';
import { ClassesModule } from '../classes/classes.module';

@Module({
  imports: [TypeOrmModule.forFeature([VideoComment, Registration]), ClassesModule],
  controllers: [CommentsController],
  providers: [CommentsService],
})
export class CommentsModule {}
