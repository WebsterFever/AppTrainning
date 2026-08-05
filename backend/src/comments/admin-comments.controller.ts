import { Body, Controller, Delete, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { ReplyCommentDto } from './dto/reply-comment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

// Admin only: moderate comments across every class.
@UseGuards(JwtAuthGuard)
@Controller('admin/comments')
export class AdminCommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get()
  listAll() {
    return this.commentsService.listAll();
  }

  @Patch(':id/reply')
  reply(@Param('id') id: string, @Body() dto: ReplyCommentDto) {
    return this.commentsService.reply(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.commentsService.remove(id);
  }
}
