import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { TrainingClass } from './class.entity';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { ExtraVideoDto } from './dto/extra-video.dto';
import { CurriculumModuleDto } from './dto/curriculum-module.dto';
import { computeScriptHash } from './ai-teacher/script-hash';

type ContentBlockRecord = NonNullable<
  NonNullable<TrainingClass['curriculumModules']>[number]['topics'][number]['contentBlocks']
>[number];
type TeacherCueRecord = NonNullable<ContentBlockRecord['guidedTeacherCues']>[number];

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
      contentBlocks?: (Omit<ContentBlockRecord, 'guidedTeacherCues'> & {
        audioStale?: boolean;
        guidedTeacherCues?: (TeacherCueRecord & { audioStale?: boolean })[];
      })[];
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
        ? { curriculumModules: this.withModuleIds(dto.curriculumModules, existing.curriculumModules) }
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

  // `existingModules` (the class's currently-persisted curriculum, when
  // updating) lets us preserve any generated ai_teacher audio metadata
  // across an ordinary "Save changes" — otherwise every save would silently
  // wipe out audio that was already generated, even for blocks the admin
  // didn't touch. Audio "staleness" (script edited since generation) is
  // surfaced separately via computeScriptHash, not by discarding the audio.
  private withModuleIds(
    modules?: CurriculumModuleDto[],
    existingModules?: TrainingClass['curriculumModules'],
  ): TrainingClass['curriculumModules'] {
    const existingAudioByBlockId = new Map<string, Partial<ContentBlockRecord>>();
    // Cue audio keyed by "blockId:cueId" — a cue's audio metadata is scoped
    // to its parent block the same way a block's is scoped to the class.
    const existingCueAudioByKey = new Map<string, Partial<TeacherCueRecord>>();
    for (const m of existingModules ?? []) {
      for (const t of m.topics ?? []) {
        for (const b of t.contentBlocks ?? []) {
          if (b.audioStatus || b.audioKey) {
            existingAudioByBlockId.set(b.id, {
              audioStatus: b.audioStatus,
              audioKey: b.audioKey,
              audioProvider: b.audioProvider,
              audioVoice: b.audioVoice,
              audioGeneratedAt: b.audioGeneratedAt,
              audioScriptHash: b.audioScriptHash,
              audioError: b.audioError,
            });
          }
          for (const cue of b.guidedTeacherCues ?? []) {
            if (!cue.audioStatus && !cue.audioKey) continue;
            existingCueAudioByKey.set(`${b.id}:${cue.id}`, {
              audioStatus: cue.audioStatus,
              audioKey: cue.audioKey,
              audioProvider: cue.audioProvider,
              audioVoice: cue.audioVoice,
              audioGeneratedAt: cue.audioGeneratedAt,
              audioScriptHash: cue.audioScriptHash,
              audioError: cue.audioError,
            });
          }
        }
      }
    }

    return modules?.map((m) => ({
      id: m.id ?? randomUUID(),
      title: m.title || undefined,
      objective: m.objective || undefined,
      project: m.project || undefined,
      topics: (m.topics ?? []).map((t) => ({
        id: t.id ?? randomUUID(),
        title: t.title || undefined,
        description: t.description || undefined,
        contentBlocks: t.contentBlocks?.map((b) => {
          const preservedAudio = b.id ? existingAudioByBlockId.get(b.id) : undefined;
          const blockId = b.id ?? randomUUID();
          return {
            id: blockId,
            type: b.type || 'text',
            content: b.content || undefined,
            label: b.label || undefined,
            language: b.language || undefined,
            voice: b.voice || undefined,
            rate: b.rate ?? undefined,
            avatarStyle: b.avatarStyle || undefined,
            instructions: b.instructions || undefined,
            showScript: b.showScript ?? undefined,
            ...preservedAudio,
            guidedTeacherEnabled: b.guidedTeacherEnabled ?? undefined,
            guidedTeacherCues: b.guidedTeacherCues?.map((cue) => {
              const cueId = cue.id ?? randomUUID();
              const preservedCueAudio = existingCueAudioByKey.get(`${blockId}:${cueId}`);
              return {
                id: cueId,
                timestampSeconds: cue.timestampSeconds,
                script: cue.script,
                language: cue.language || undefined,
                voice: cue.voice || undefined,
                rate: cue.rate ?? undefined,
                ...preservedCueAudio,
              };
            }),
          };
        }),
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

  // Persists an entity already mutated in place (e.g. AiTeacherService
  // updating one block's audio metadata within curriculumModules) without
  // handing out direct repository access.
  async saveEntity(entity: TrainingClass): Promise<TrainingClass> {
    return this.classesRepo.save(entity);
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

  // For every ai_teacher block that has generated audio, flags whether the
  // script/language/voice/rate have changed since that audio was generated
  // — computed on read rather than eagerly, so an ordinary script edit
  // never silently discards the existing (still-playable) audio. Safe to
  // call on already-preview()'d modules too (contentBlocks is just absent).
  withAudioStaleness(
    modules?: TrainingClass['curriculumModules'],
  ): ClassWithCount['curriculumModules'] {
    return modules?.map((m) => ({
      ...m,
      topics: m.topics.map((t) => ({
        ...t,
        contentBlocks: t.contentBlocks?.map((b) => {
          const cues = b.guidedTeacherCues?.map((cue) => {
            if (!cue.audioScriptHash) return cue;
            const cueHash = computeScriptHash(cue.script, cue.language, cue.voice, cue.rate);
            return { ...cue, audioStale: cue.audioStatus === 'ready' && cueHash !== cue.audioScriptHash };
          });
          const withCues = cues ? { ...b, guidedTeacherCues: cues } : b;
          if (b.type !== 'ai_teacher' || !b.audioScriptHash) return withCues;
          const currentHash = computeScriptHash(b.content, b.language, b.voice, b.rate);
          return { ...withCues, audioStale: b.audioStatus === 'ready' && currentHash !== b.audioScriptHash };
        }),
      })),
    }));
  }

  // Removes the private S3 object key from every ai_teacher block before a
  // response reaches any client. `audioKey` has no legitimate client-side
  // use — audio is always fetched through the access-controlled streaming
  // endpoints (keyed by classId/blockId, which re-check registration and
  // module-unlock status server-side), never by this raw key. Exposing it
  // let it be replayed directly against the generic, unauthenticated
  // /uploads/file/:folder/:filename route, bypassing course access rules.
  stripPrivateAudioFields(
    modules?: ClassWithCount['curriculumModules'],
  ): ClassWithCount['curriculumModules'] {
    return modules?.map((m) => ({
      ...m,
      topics: m.topics.map((t) => ({
        ...t,
        contentBlocks: t.contentBlocks?.map((b) => {
          const cues = b.guidedTeacherCues?.map((cue) => {
            if (!('audioKey' in cue)) return cue;
            const { audioKey: _cueAudioKey, ...rest } = cue as typeof cue & { audioKey?: string };
            return rest;
          });
          const withCues = cues ? { ...b, guidedTeacherCues: cues } : b;
          if (b.type !== 'ai_teacher' || !('audioKey' in withCues)) return withCues;
          const { audioKey: _audioKey, ...rest } = withCues as typeof withCues & { audioKey?: string };
          return rest;
        }),
      })),
    }));
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
    const curriculumModules = this.stripPrivateAudioFields(
      revealPrivateContent
        ? this.withAudioStaleness(row.curriculumModules)
        : row.curriculumModules?.map((m) => this.previewModule(m)),
    );
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
