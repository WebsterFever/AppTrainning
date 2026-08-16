import { Body, Controller, Delete, Get, Param, Post, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { VideoRenderService } from './video-render.service';
import { GenerateVideoDto } from './dto/generate-video.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

// Admin only — the one path that starts a render job or spends compute on
// it. Students never hit anything under /admin.
@UseGuards(JwtAuthGuard)
@Controller('admin/classes/:classId/blocks/:blockId')
export class AdminVideoRenderController {
  constructor(private readonly videoRenderService: VideoRenderService) {}

  // Starts an async background render job and returns immediately with the
  // initial ('queued') status — never holds the HTTP request open until
  // the MP4 is finished. The admin UI polls video-status afterward.
  @Post('generate-video')
  generateVideo(
    @Param('classId') classId: string,
    @Param('blockId') blockId: string,
    @Body() dto: GenerateVideoDto,
  ) {
    return this.videoRenderService.generateVideo(classId, blockId, dto);
  }

  @Get('video-status')
  getVideoStatus(@Param('classId') classId: string, @Param('blockId') blockId: string) {
    return this.videoRenderService.getStatus(classId, blockId);
  }

  @Get('video')
  async getVideo(
    @Param('classId') classId: string,
    @Param('blockId') blockId: string,
    @Res() res: Response,
  ) {
    const { body, contentType } = await this.videoRenderService.streamForAdmin(classId, blockId);
    res.setHeader('Content-Type', contentType ?? 'video/mp4');
    (body as NodeJS.ReadableStream).pipe(res);
  }

  @Delete('video')
  deleteVideo(@Param('classId') classId: string, @Param('blockId') blockId: string) {
    return this.videoRenderService.deleteVideo(classId, blockId);
  }
}
