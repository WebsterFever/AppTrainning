import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { AdminReplyDto } from './dto/admin-reply.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

// Admin only: view every conversation and reply, always as the school.
@UseGuards(JwtAuthGuard)
@Controller('admin/chat')
export class AdminChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('threads')
  listThreads() {
    return this.chatService.listThreads();
  }

  @Get('threads/:email/messages')
  getThread(@Param('email') email: string) {
    return this.chatService.getThreadForAdmin(email);
  }

  @Post('threads/:email/messages')
  reply(@Param('email') email: string, @Body() dto: AdminReplyDto) {
    return this.chatService.sendFromAdmin(email, dto.text);
  }
}
