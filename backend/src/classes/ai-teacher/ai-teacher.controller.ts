import { BadRequestException, Controller, Get, Param, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { AiTeacherService } from './ai-teacher.service';

// Public route, but NOT unauthenticated in effect — streamForStudent
// independently re-checks registration + module-unlock status by email
// before returning any audio bytes, the same protection the lesson script
// itself already has. Nothing here is servable without that check passing.
@Controller('classes/:classId/blocks/:blockId')
export class AiTeacherController {
  constructor(private readonly aiTeacherService: AiTeacherService) {}

  @Get('audio')
  async getAudio(
    @Param('classId') classId: string,
    @Param('blockId') blockId: string,
    @Query('email') email: string | undefined,
    @Res() res: Response,
  ) {
    if (!email) throw new BadRequestException('email is required');
    const { body, contentType } = await this.aiTeacherService.streamForStudent(classId, blockId, email);
    res.setHeader('Content-Type', contentType ?? 'audio/mpeg');
    res.setHeader('Cache-Control', 'private, max-age=86400');
    (body as NodeJS.ReadableStream).pipe(res);
  }

  // Guided Video Lesson cue audio — same protection as the block route
  // above, plus streamCueForStudent independently verifies the cue belongs
  // to this exact block.
  @Get('cues/:cueId/audio')
  async getCueAudio(
    @Param('classId') classId: string,
    @Param('blockId') blockId: string,
    @Param('cueId') cueId: string,
    @Query('email') email: string | undefined,
    @Res() res: Response,
  ) {
    if (!email) throw new BadRequestException('email is required');
    const { body, contentType } = await this.aiTeacherService.streamCueForStudent(classId, blockId, cueId, email);
    res.setHeader('Content-Type', contentType ?? 'audio/mpeg');
    res.setHeader('Cache-Control', 'private, max-age=86400');
    (body as NodeJS.ReadableStream).pipe(res);
  }
}
