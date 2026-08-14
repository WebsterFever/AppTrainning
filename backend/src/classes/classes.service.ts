import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { TrainingClass } from './class.entity';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { ExtraVideoDto } from './dto/extra-video.dto';
import { CurriculumModuleDto } from './dto/curriculum-module.dto';

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
  language?: 'en' | 'fr' | 'ht';
  priceCents?: number;
  allowedEmails?: string[];
  registrationCount: number;
  registeredNames?: string[];
  curriculumModules?: {
    id: string;
    title?: string;
    objective?: string;
    project?: string;
    topics: {
      id: string;
      title?: string;
      description?: string;
      contentBlocks?: {
        id: string;
        type?: string;
        content?: string;
        label?: string;
        language?: string;
        voice?: string;
        rate?: number;
        avatarStyle?: string;
        instructions?: string;
      }[];
    }[];
  }[];
}

@Injectable()
export class ClassesService {
  constructor(
    @InjectRepository(TrainingClass)
    private readonly classesRepo: Repository<TrainingClass>,
  ) {}

  async findAll(status?: 'upcoming' | 'past', language?: 'en' | 'fr' | 'ht'): Promise<ClassWithCount[]> {
    const qb = this.classesRepo
      .createQueryBuilder('class')
      .loadRelationCountAndMap('class.registrationCount', 'class.registrations')
      .orderBy('class.classDate', status === 'past' ? 'DESC' : 'ASC');

    if (status === 'upcoming') qb.where('class.isPast = false');
    if (status === 'past') qb.where('class.isPast = true');
    // Strict match only — a class with no language set (legacy rows from
    // before this field existed) does not leak into every section.
    if (language) qb.andWhere('class.language = :language', { language });

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
      curriculumModules: this.withModuleIds(dto.curriculumModules),
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
      ...(dto.curriculumModules
        ? { curriculumModules: this.withModuleIds(dto.curriculumModules) }
        : {}),
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

  private withModuleIds(modules?: CurriculumModuleDto[]): TrainingClass['curriculumModules'] {
    return modules?.map((m) => ({
      id: m.id ?? randomUUID(),
      title: m.title || undefined,
      objective: m.objective || undefined,
      project: m.project || undefined,
      topics: (m.topics ?? []).map((t) => ({
        id: t.id ?? randomUUID(),
        title: t.title || undefined,
        description: t.description || undefined,
        contentBlocks: t.contentBlocks?.map((b) => ({
          id: b.id ?? randomUUID(),
          type: b.type || 'text',
          content: b.content || undefined,
          label: b.label || undefined,
          language: b.language || undefined,
          voice: b.voice || undefined,
          rate: b.rate ?? undefined,
          avatarStyle: b.avatarStyle || undefined,
          instructions: b.instructions || undefined,
        })),
      })),
    }));
  }

  // Comments are keyed by an opaque "ref" string within a class — either a
  // video ('main', or an extraVideos id) or a curriculum module
  // ('module-<moduleId>', for the per-module discussion at the bottom of
  // each module's lesson content). This just validates the ref actually
  // belongs to the class before letting a comment attach to it.
  async commentTargetExists(classId: string, ref: string): Promise<boolean> {
    if (ref === 'main') return true;
    const row = await this.classesRepo.findOne({ where: { id: classId } });
    if (!row) return false;
    if (row.extraVideos?.some((v) => v.id === ref)) return true;
    const moduleId = ref.startsWith('module-') ? ref.slice('module-'.length) : null;
    return !!moduleId && !!row.curriculumModules?.some((m) => m.id === moduleId);
  }

  async markPast(id: string, isPast: boolean): Promise<TrainingClass> {
    return this.update(id, { isPast } as UpdateClassDto);
  }

  // Called by PaymentsService once a Stripe payment for this class/email
  // completes — grants access the same way an admin manually adding the
  // email to the allowlist would.
  async grantAccess(id: string, email: string): Promise<void> {
    const existing = await this.classesRepo.findOne({ where: { id } });
    if (!existing) return;
    existing.allowedEmails = this.normalizeEmails([...(existing.allowedEmails ?? []), email]);
    await this.classesRepo.save(existing);
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

  // Strips a module's private lesson content (contentBlocks), keeping only
  // the public marketing-curriculum shape (title/objective/topics'
  // titles+descriptions/project). Used both for anonymous visitors (see
  // toPublicShape) and for a registered student who hasn't yet unlocked a
  // given module (see RegistrationsService.register — a locked module still
  // shows its outline, just not the actual lesson).
  previewModule(
    m: NonNullable<TrainingClass['curriculumModules']>[number],
  ): NonNullable<TrainingClass['curriculumModules']>[number] {
    return {
      ...m,
      topics: m.topics.map((t) => ({ id: t.id, title: t.title, description: t.description })),
    };
  }

  private toPublicShape(
    row: TrainingClass & { registrationCount?: number },
    includeNames = false,
    revealZoomLink = false,
  ): ClassWithCount {
    const names = includeNames ? (row.registrations ?? []).map((r) => r.name) : undefined;
    // Same rule as the Zoom link below: private lesson content (contentBlocks)
    // is only included once a visitor has actually registered/unlocked the
    // class (delivered via RegistrationsService.register instead), or for
    // admin views, or once a class is past (archival, no longer gated). The
    // module/topic titles + descriptions themselves stay public always —
    // that's the marketing curriculum.
    const revealPrivateContent = row.isPast || revealZoomLink;
    const curriculumModules = revealPrivateContent
      ? row.curriculumModules
      : row.curriculumModules?.map((m) => this.previewModule(m));
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
      curriculumModules,
      classDate: row.classDate,
      // Hide link publicly pre-registration, unless explicitly revealed (admin views).
      zoomLink: row.isPast || revealZoomLink ? row.zoomLink : undefined,
      isPast: row.isPast,
      isPaid: row.isPaid,
      language: row.language ?? undefined,
      priceCents: row.priceCents ?? undefined,
      // The allowlist itself is admin-only — never exposed to public/student views.
      ...(revealZoomLink ? { allowedEmails: row.allowedEmails ?? [] } : {}),
      registrationCount: includeNames ? (names?.length ?? 0) : (row.registrationCount ?? 0),
      ...(names ? { registeredNames: names } : {}),
    } as ClassWithCount;
  }
}
