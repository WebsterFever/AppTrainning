import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VideoComment } from './comment.entity';
import { CreateCommentDto } from './dto/create-comment.dto';
import { ClassesService } from '../classes/classes.service';
import { Registration } from '../registrations/registration.entity';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(VideoComment)
    private readonly commentsRepo: Repository<VideoComment>,
    @InjectRepository(Registration)
    private readonly registrationsRepo: Repository<Registration>,
    private readonly classesService: ClassesService,
  ) {}

  async list(classId: string, videoRef: string) {
    if (!(await this.classesService.videoExists(classId, videoRef))) {
      throw new NotFoundException('Video not found');
    }

    const comments = await this.commentsRepo.find({
      where: { trainingClass: { id: classId }, videoRef },
      order: { createdAt: 'ASC' },
    });

    return comments.map((c) => ({ id: c.id, name: c.name, text: c.text, createdAt: c.createdAt }));
  }

  async create(classId: string, videoRef: string, dto: CreateCommentDto) {
    const trainingClass = await this.classesService.getEntity(classId);
    if (!(await this.classesService.videoExists(classId, videoRef))) {
      throw new NotFoundException('Video not found');
    }

    const isRegistered = await this.registrationsRepo.exist({
      where: { trainingClass: { id: classId }, email: dto.email.toLowerCase() },
    });
    if (!isRegistered) {
      throw new ForbiddenException('You must register for this class before commenting.');
    }

    const comment = this.commentsRepo.create({
      trainingClass,
      videoRef,
      name: dto.name,
      email: dto.email.toLowerCase(),
      text: dto.text,
    });
    const saved = await this.commentsRepo.save(comment);
    return { id: saved.id, name: saved.name, text: saved.text, createdAt: saved.createdAt };
  }
}
