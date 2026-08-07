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
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import { UploadsService } from './uploads.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const MAX_RESOURCE_SIZE = 20 * 1024 * 1024; // 20 MB
const ALLOWED_RESOURCE_TYPES = [...ALLOWED_IMAGE_TYPES, 'application/pdf'];

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
    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Photo must be a JPEG, PNG, WEBP, or GIF image');
    }

    const key = await this.uploadsService.upload(file.buffer, file.mimetype, 'contest-photos');
    const url = `${req.protocol}://${req.get('host')}/uploads/file/${key}`;
    return { url };
  }

  // Admin only: PDF/picture resources attached to a class video for students to download.
  @UseGuards(JwtAuthGuard)
  @Post('class-resource')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_RESOURCE_SIZE } }))
  async uploadClassResource(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() req: Request,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    if (!ALLOWED_RESOURCE_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('File must be a PDF, JPEG, PNG, WEBP, or GIF');
    }

    const key = await this.uploadsService.upload(file.buffer, file.mimetype, 'class-resources');
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
