import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import { UploadsService } from './uploads.service';

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('contest-photo')
  @UseInterceptors(FileInterceptor('photo', { limits: { fileSize: MAX_SIZE } }))
  async uploadContestPhoto(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() req: Request,
  ) {
    if (!file) throw new BadRequestException('No photo uploaded');
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Photo must be a JPEG, PNG, WEBP, or GIF image');
    }

    const key = await this.uploadsService.upload(file.buffer, file.mimetype, 'contest-photos');
    const url = `${req.protocol}://${req.get('host')}/uploads/file/${key}`;
    return { url };
  }

  @Get('file/:folder/:filename')
  async serveFile(
    @Param('folder') folder: string,
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    try {
      const { body, contentType } = await this.uploadsService.getObject(`${folder}/${filename}`);
      res.setHeader('Content-Type', contentType ?? 'application/octet-stream');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      (body as NodeJS.ReadableStream).pipe(res);
    } catch {
      throw new NotFoundException('File not found');
    }
  }
}
