import { BadRequestException, Controller, Get, Param, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { VideoRenderService } from './video-render.service';

// Public route, but NOT unauthenticated in effect — streamForStudent
// independently re-checks registration + module-unlock status by email
// before returning any video bytes, the same protection standalone AI
// Teacher audio and Guided Video cue audio already have. Nothing here is
// servable without that check passing.
@Controller('classes/:classId/blocks/:blockId')
export class VideoRenderController {
  constructor(private readonly videoRenderService: VideoRenderService) {}

  @Get('video')
  async getVideo(
    @Param('classId') classId: string,
    @Param('blockId') blockId: string,
    @Query('email') email: string | undefined,
    @Res() res: Response,
  ) {
    if (!email) throw new BadRequestException('email is required');
    const { body, contentType } = await this.videoRenderService.streamForStudent(classId, blockId, email);
    res.setHeader('Content-Type', contentType ?? 'video/mp4');
    res.setHeader('Cache-Control', 'private, max-age=86400');
    (body as NodeJS.ReadableStream).pipe(res);
  }
}
