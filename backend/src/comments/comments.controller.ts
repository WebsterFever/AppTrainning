import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';

@Controller('classes/:classId/videos/:videoRef/comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get()
  list(@Param('classId') classId: string, @Param('videoRef') videoRef: string) {
    return this.commentsService.list(classId, videoRef);
  }

  @Post()
  create(
    @Param('classId') classId: string,
    @Param('videoRef') videoRef: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.commentsService.create(classId, videoRef, dto);
  }
}
