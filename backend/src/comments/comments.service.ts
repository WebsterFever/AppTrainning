import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VideoComment } from './comment.entity';
import { CreateCommentDto } from './dto/create-comment.dto';
import { ReplyCommentDto } from './dto/reply-comment.dto';
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
    if (!(await this.classesService.commentTargetExists(classId, videoRef))) {
      throw new NotFoundException('Video not found');
    }

    const comments = await this.commentsRepo.find({
      where: { trainingClass: { id: classId }, videoRef },
      order: { createdAt: 'ASC' },
    });

    return comments.map((c) => ({
      id: c.id,
      name: c.name,
      text: c.text,
      reply: c.reply,
      repliedAt: c.repliedAt,
      createdAt: c.createdAt,
    }));
  }

  async create(classId: string, videoRef: string, dto: CreateCommentDto) {
    const trainingClass = await this.classesService.getEntity(classId);
    if (!(await this.classesService.commentTargetExists(classId, videoRef))) {
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

  async listAll() {
    const comments = await this.commentsRepo.find({
      relations: ['trainingClass'],
      order: { createdAt: 'DESC' },
    });

    return comments.map((c) => ({
      id: c.id,
      classId: c.trainingClass.id,
      classTitle: c.trainingClass.title,
      videoRef: c.videoRef,
      videoLabel: this.videoLabel(c.trainingClass, c.videoRef),
      name: c.name,
      email: c.email,
      text: c.text,
      reply: c.reply,
      repliedAt: c.repliedAt,
      createdAt: c.createdAt,
    }));
  }

  async reply(commentId: string, dto: ReplyCommentDto) {
    const comment = await this.commentsRepo.findOne({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Comment not found');

    comment.reply = dto.reply;
    comment.repliedAt = new Date();
    const saved = await this.commentsRepo.save(comment);
    return { id: saved.id, reply: saved.reply, repliedAt: saved.repliedAt };
  }

  async remove(commentId: string): Promise<void> {
    const result = await this.commentsRepo.delete(commentId);
    if (!result.affected) throw new NotFoundException('Comment not found');
  }

  private videoLabel(
    trainingClass: {
      videoUrl?: string | null;
      extraVideos?: { id: string; title: string }[];
      curriculumModules?: { id: string; title?: string }[];
    },
    videoRef: string,
  ): string {
    if (videoRef === 'main') return 'Main video';
    if (videoRef.startsWith('module-')) {
      const moduleId = videoRef.slice('module-'.length);
      const mod = trainingClass.curriculumModules?.find((m) => m.id === moduleId);
      return mod ? `Module: ${mod.title ?? 'Untitled'}` : 'Module';
    }
    return trainingClass.extraVideos?.find((v) => v.id === videoRef)?.title ?? 'Video';
  }
}
