import { Body, Controller, Get, Param, Post, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { AiTeacherService } from './ai-teacher.service';
import { GenerateAudioDto } from './dto/generate-audio.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

// Admin only — this is the one path that actually calls the paid TTS API.
// Students never hit anything under /admin.
@UseGuards(JwtAuthGuard)
@Controller('admin/classes/:classId/blocks/:blockId')
export class AdminAiTeacherController {
  constructor(private readonly aiTeacherService: AiTeacherService) {}

  @Post('generate-audio')
  generateAudio(
    @Param('classId') classId: string,
    @Param('blockId') blockId: string,
    @Body() dto: GenerateAudioDto,
  ) {
    return this.aiTeacherService.generateAudio(classId, blockId, dto);
  }

  @Get('audio')
  async getAudio(
    @Param('classId') classId: string,
    @Param('blockId') blockId: string,
    @Res() res: Response,
  ) {
    const { body, contentType } = await this.aiTeacherService.streamForAdmin(classId, blockId);
    res.setHeader('Content-Type', contentType ?? 'audio/mpeg');
    (body as NodeJS.ReadableStream).pipe(res);
  }

  @Post('cues/:cueId/generate-audio')
  generateCueAudio(
    @Param('classId') classId: string,
    @Param('blockId') blockId: string,
    @Param('cueId') cueId: string,
    @Body() dto: GenerateAudioDto,
  ) {
    return this.aiTeacherService.generateCueAudio(classId, blockId, cueId, dto);
  }

  @Get('cues/:cueId/audio')
  async getCueAudio(
    @Param('classId') classId: string,
    @Param('blockId') blockId: string,
    @Param('cueId') cueId: string,
    @Res() res: Response,
  ) {
    const { body, contentType } = await this.aiTeacherService.streamCueForAdmin(classId, blockId, cueId);
    res.setHeader('Content-Type', contentType ?? 'audio/mpeg');
    (body as NodeJS.ReadableStream).pipe(res);
  }
}
