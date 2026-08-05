import { BadRequestException, Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('messages')
  send(@Body() dto: SendMessageDto) {
    return this.chatService.sendFromStudent(dto);
  }

  @Get('messages')
  getThread(@Query('email') email: string) {
    if (!email) throw new BadRequestException('email is required');
    return this.chatService.getThread(email);
  }
}
