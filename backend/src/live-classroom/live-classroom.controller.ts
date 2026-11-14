import { Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LiveClassroomService } from './live-classroom.service';

@Controller('admin/classes/:classId/live')
@UseGuards(JwtAuthGuard)
export class LiveClassroomController {
  constructor(private readonly live: LiveClassroomService) {}

  /** Admin-only token. Never accept a user-selected role or room name. */
  @Post('teacher-token')
  teacherToken(
    @Param('classId') classId: string,
    @Req() req: { user: { sub: string } },
  ) {
    return this.live.teacherConnection(classId, req.user.sub);
  }
}
