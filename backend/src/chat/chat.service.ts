import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessage } from './chat-message.entity';
import { ChatGateway } from './chat.gateway';
import { SendMessageDto } from './dto/send-message.dto';

export const SCHOOL_NAME = 'Webster Technology School';

export interface ChatThread {
  email: string;
  name: string;
  lastMessage: string;
  lastMessageAt: Date;
  unreadCount: number;
}

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatMessage)
    private readonly chatRepo: Repository<ChatMessage>,
    private readonly gateway: ChatGateway,
  ) {}

  async sendFromStudent(dto: SendMessageDto): Promise<ChatMessage> {
    const message = this.chatRepo.create({
      name: dto.name,
      email: dto.email.toLowerCase(),
      sender: 'student',
      text: dto.text,
      readByAdmin: false,
    });
    const saved = await this.chatRepo.save(message);
    this.gateway.notifyAdmin(saved);
    return saved;
  }

  async sendFromAdmin(email: string, text: string): Promise<ChatMessage> {
    const normalizedEmail = email.toLowerCase();
    const hasThread = await this.chatRepo.exist({ where: { email: normalizedEmail } });
    if (!hasThread) throw new NotFoundException('No conversation found for this email');

    const message = this.chatRepo.create({
      name: SCHOOL_NAME,
      email: normalizedEmail,
      sender: 'admin',
      text,
      readByAdmin: true,
    });
    const saved = await this.chatRepo.save(message);
    this.gateway.notifyStudent(saved);
    return saved;
  }

  async getThread(email: string): Promise<ChatMessage[]> {
    return this.chatRepo.find({
      where: { email: email.toLowerCase() },
      order: { createdAt: 'ASC' },
    });
  }

  // Admin only: fetch a thread and mark the student's messages as read.
  async getThreadForAdmin(email: string): Promise<ChatMessage[]> {
    const normalizedEmail = email.toLowerCase();
    const messages = await this.getThread(normalizedEmail);
    await this.chatRepo.update(
      { email: normalizedEmail, sender: 'student', readByAdmin: false },
      { readByAdmin: true },
    );
    return messages;
  }

  async listThreads(): Promise<ChatThread[]> {
    const messages = await this.chatRepo.find({ order: { createdAt: 'ASC' } });
    const byEmail = new Map<string, ChatMessage[]>();
    for (const m of messages) {
      const list = byEmail.get(m.email) ?? [];
      list.push(m);
      byEmail.set(m.email, list);
    }

    return Array.from(byEmail.entries())
      .map(([email, msgs]) => {
        const last = msgs[msgs.length - 1];
        const studentMsgs = msgs.filter((m) => m.sender === 'student');
        const name = [...msgs].reverse().find((m) => m.sender === 'student')?.name ?? last.name;
        return {
          email,
          name,
          lastMessage: last.text,
          lastMessageAt: last.createdAt,
          unreadCount: studentMsgs.filter((m) => !m.readByAdmin).length,
        };
      })
      .sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime());
  }
}
