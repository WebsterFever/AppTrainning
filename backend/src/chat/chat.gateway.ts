import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { ChatMessage } from './chat-message.entity';

const ADMIN_ROOM = 'admin-room';
const studentRoom = (email: string) => `student:${email.toLowerCase()}`;

@WebSocketGateway({ cors: { origin: true, credentials: true } })
export class ChatGateway {
  @WebSocketServer()
  server: Server;

  constructor(private readonly jwtService: JwtService) {}

  @SubscribeMessage('join-student')
  handleJoinStudent(@ConnectedSocket() client: Socket, @MessageBody() body: { email: string }) {
    if (!body?.email) return;
    client.join(studentRoom(body.email));
  }

  @SubscribeMessage('join-admin')
  async handleJoinAdmin(@ConnectedSocket() client: Socket, @MessageBody() body: { token: string }) {
    try {
      await this.jwtService.verifyAsync(body?.token ?? '');
      client.join(ADMIN_ROOM);
    } catch {
      // Invalid token: simply don't join the admin room.
    }
  }

  notifyAdmin(message: ChatMessage) {
    this.server.to(ADMIN_ROOM).emit('new-message', message);
  }

  notifyStudent(message: ChatMessage) {
    this.server.to(studentRoom(message.email)).emit('new-message', message);
  }
}
