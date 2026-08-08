import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { TrainingClass } from './class.entity';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { ExtraVideoDto } from './dto/extra-video.dto';

export interface ClassWithCount {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  videoUrl?: string;
  videoNotes?: string;
  videoPdfUrl?: string;
  videoPdfName?: string;
  videoResourceImageUrl?: string;
  videoResourceImageName?: string;
  extraVideos?: {
    id: string;
    title: string;
    url: string;
    notes?: string;
    pdfUrl?: string;
    pdfName?: string;
    imageUrl?: string;
    imageName?: string;
  }[];
  classDate?: Date;
  zoomLink?: string;
  isPast: boolean;
  isPaid: boolean;
  allowedEmails?: string[];
  registrationCount: number;
  registeredNames?: string[];
}

@Injectable()
export class ClassesService {
  constructor(
    @InjectRepository(TrainingClass)
    private readonly classesRepo: Repository<TrainingClass>,
  ) {}

  async findAll(status?: 'upcoming' | 'past'): Promise<ClassWithCount[]> {
    const qb = this.classesRepo
      .createQueryBuilder('class')
      .loadRelationCountAndMap('class.registrationCount', 'class.registrations')
      .orderBy('class.classDate', status === 'past' ? 'DESC' : 'ASC');

    if (status === 'upcoming') qb.where('class.isPast = false');
    if (status === 'past') qb.where('class.isPast = true');

    const rows = await qb.getMany();
    return rows.map((row) => this.toPublicShape(row));
  }

  // Admin only: same as findAll, but always includes the Zoom link (never
  // redacted) so the admin can see/edit it regardless of isPast.
  async findAllForAdmin(): Promise<ClassWithCount[]> {
    const rows = await this.classesRepo
      .createQueryBuilder('class')
      .loadRelationCountAndMap('class.registrationCount', 'class.registrations')
      .orderBy('class.classDate', 'DESC')
      .getMany();

    return rows.map((row) => this.toPublicShape(row, false, true));
  }

  async findOne(id: string): Promise<ClassWithCount> {
    const row = await this.classesRepo
      .createQueryBuilder('class')
      .leftJoin('class.registrations', 'registration')
      .addSelect(['registration.id', 'registration.name'])
      .orderBy('registration.registeredAt', 'ASC')
      .where('class.id = :id', { id })
      .getOne();

    if (!row) throw new NotFoundException('Class not found');
    return this.toPublicShape(row, true);
  }

  async create(dto: CreateClassDto): Promise<TrainingClass> {
    const entity = this.classesRepo.create({
      ...dto,
      extraVideos: this.withVideoIds(dto.extraVideos),
      classDate: dto.classDate ? new Date(dto.classDate) : undefined,
      ...(dto.allowedEmails ? { allowedEmails: this.normalizeEmails(dto.allowedEmails) } : {}),
    });
    return this.classesRepo.save(entity);
  }

  async update(id: string, dto: UpdateClassDto): Promise<TrainingClass> {
    const existing = await this.classesRepo.findOne({ where: { id } });
    if (!existing) throw new NotFoundException('Class not found');

    Object.assign(existing, {
      ...dto,
      ...(dto.extraVideos ? { extraVideos: this.withVideoIds(dto.extraVideos) } : {}),
      ...(dto.allowedEmails ? { allowedEmails: this.normalizeEmails(dto.allowedEmails) } : {}),
      classDate: dto.classDate ? new Date(dto.classDate) : existing.classDate,
    });
    return this.classesRepo.save(existing);
  }

  private normalizeEmails(emails: string[]): string[] {
    const seen = new Set<string>();
    for (const email of emails) {
      const normalized = email.trim().toLowerCase();
      if (normalized) seen.add(normalized);
    }
    return Array.from(seen);
  }

  private withVideoIds(extraVideos?: ExtraVideoDto[]): TrainingClass['extraVideos'] {
    return extraVideos?.map((v) => ({
      id: v.id ?? randomUUID(),
      title: v.title,
      url: v.url,
      notes: v.notes,
      pdfUrl: v.pdfUrl ?? undefined,
      pdfName: v.pdfName ?? undefined,
      imageUrl: v.imageUrl ?? undefined,
      imageName: v.imageName ?? undefined,
    }));
  }

  async videoExists(classId: string, videoRef: string): Promise<boolean> {
    if (videoRef === 'main') return true;
    const row = await this.classesRepo.findOne({ where: { id: classId } });
    return !!row?.extraVideos?.some((v) => v.id === videoRef);
  }

  async markPast(id: string, isPast: boolean): Promise<TrainingClass> {
    return this.update(id, { isPast } as UpdateClassDto);
  }

  async remove(id: string): Promise<void> {
    const result = await this.classesRepo.delete(id);
    if (!result.affected) throw new NotFoundException('Class not found');
  }

  async getEntity(id: string): Promise<TrainingClass> {
    const row = await this.classesRepo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Class not found');
    return row;
  }

  private toPublicShape(
    row: TrainingClass & { registrationCount?: number },
    includeNames = false,
    revealZoomLink = false,
  ): ClassWithCount {
    const names = includeNames ? (row.registrations ?? []).map((r) => r.name) : undefined;
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      imageUrl: row.imageUrl,
      videoUrl: row.videoUrl,
      videoNotes: row.videoNotes,
      videoPdfUrl: row.videoPdfUrl,
      videoPdfName: row.videoPdfName,
      videoResourceImageUrl: row.videoResourceImageUrl,
      videoResourceImageName: row.videoResourceImageName,
      extraVideos: row.extraVideos,
      classDate: row.classDate,
      // Hide link publicly pre-registration, unless explicitly revealed (admin views).
      zoomLink: row.isPast || revealZoomLink ? row.zoomLink : undefined,
      isPast: row.isPast,
      isPaid: row.isPaid,
      // The allowlist itself is admin-only — never exposed to public/student views.
      ...(revealZoomLink ? { allowedEmails: row.allowedEmails ?? [] } : {}),
      registrationCount: includeNames ? (names?.length ?? 0) : (row.registrationCount ?? 0),
      ...(names ? { registeredNames: names } : {}),
    } as ClassWithCount;
  }
}
