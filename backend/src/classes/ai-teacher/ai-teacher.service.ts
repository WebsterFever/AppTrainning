import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClassesService } from '../classes.service';
import { TrainingClass } from '../class.entity';
import { Registration } from '../../registrations/registration.entity';
import { SubmissionsService } from '../../submissions/submissions.service';
import { UploadsService } from '../../uploads/uploads.service';
import { GenerateAudioDto } from './dto/generate-audio.dto';
import { OpenAiTtsProvider } from './openai-tts.provider';
import { computeScriptHash } from './script-hash';

type ContentBlockRecord = NonNullable<
  NonNullable<TrainingClass['curriculumModules']>[number]['topics'][number]['contentBlocks']
>[number];
type TeacherCueRecord = NonNullable<ContentBlockRecord['guidedTeacherCues']>[number];

interface BlockLocation {
  trainingClass: TrainingClass;
  moduleId: string;
  block: ContentBlockRecord;
}

interface CueLocation {
  trainingClass: TrainingClass;
  moduleId: string;
  block: ContentBlockRecord;
  cue: TeacherCueRecord;
}

export interface AudioStatusResponse {
  audioStatus?: string;
  audioProvider?: string;
  audioVoice?: string;
  audioGeneratedAt?: string;
  audioScriptHash?: string;
  audioError?: string;
  content?: string;
  label?: string;
  language?: string;
  voice?: string;
  rate?: number;
}

export interface CueAudioStatusResponse {
  audioStatus?: string;
  audioProvider?: string;
  audioVoice?: string;
  audioGeneratedAt?: string;
  audioScriptHash?: string;
  audioError?: string;
  script?: string;
  language?: string;
  voice?: string;
  rate?: number;
}

const AUDIO_KEY_PREFIX = 'ai-teacher-audio';

@Injectable()
export class AiTeacherService {
  // In-memory, single-instance lock — this app runs as one Railway
  // service instance, so this is enough to stop a double-click (or two
  // admin tabs) from triggering two paid API calls for the same block.
  private readonly generating = new Set<string>();

  constructor(
    @InjectRepository(Registration)
    private readonly registrationsRepo: Repository<Registration>,
    private readonly classesService: ClassesService,
    private readonly submissionsService: SubmissionsService,
    private readonly uploadsService: UploadsService,
    private readonly ttsProvider: OpenAiTtsProvider,
  ) {}

  private findBlock(trainingClass: TrainingClass, blockId: string): BlockLocation {
    for (const mod of trainingClass.curriculumModules ?? []) {
      for (const topic of mod.topics ?? []) {
        const block = topic.contentBlocks?.find((b) => b.id === blockId);
        if (block) return { trainingClass, moduleId: mod.id, block };
      }
    }
    throw new NotFoundException('Content block not found');
  }

  // A cue must belong to the requested block — looking it up inside
  // `block.guidedTeacherCues` (rather than a flat search) is what makes a
  // cueId from one block unable to be played back through another block's
  // route, satisfying "requested teacher cue belongs to that video block".
  private findCue(trainingClass: TrainingClass, blockId: string, cueId: string): CueLocation {
    const { moduleId, block } = this.findBlock(trainingClass, blockId);
    const cue = block.guidedTeacherCues?.find((c) => c.id === cueId);
    if (!cue) throw new NotFoundException('Teacher cue not found');
    return { trainingClass, moduleId, block, cue };
  }

  private toStatusResponse(block: ContentBlockRecord): AudioStatusResponse {
    return {
      audioStatus: block.audioStatus,
      audioProvider: block.audioProvider,
      audioVoice: block.audioVoice,
      audioGeneratedAt: block.audioGeneratedAt,
      audioScriptHash: block.audioScriptHash,
      audioError: block.audioError,
      content: block.content,
      label: block.label,
      language: block.language,
      voice: block.voice,
      rate: block.rate,
    };
  }

  // Admin only (enforced by JwtAuthGuard at the controller). Generates
  // once and persists — every subsequent student playback reuses this same
  // stored file, it never re-calls the TTS API.
  async generateAudio(classId: string, blockId: string, dto: GenerateAudioDto): Promise<AudioStatusResponse> {
    if (this.generating.has(blockId)) {
      throw new ConflictException('Audio is already being generated for this lesson — please wait.');
    }

    const trainingClass = await this.classesService.getEntity(classId);
    const { block } = this.findBlock(trainingClass, blockId);
    if (block.type !== 'ai_teacher') {
      throw new NotFoundException('That block is not an AI Teacher block');
    }

    this.generating.add(blockId);
    try {
      block.audioStatus = 'generating';
      block.audioError = undefined;
      await this.classesService.saveEntity(trainingClass);

      if (!this.ttsProvider.supportsLanguage(dto.language)) {
        block.audioStatus = 'failed';
        block.audioError =
          'Neural voice is not available for this language yet — the browser voice will be used instead.';
        block.content = dto.script;
        block.label = dto.label;
        block.language = dto.language;
        block.voice = dto.voice;
        block.rate = dto.rate;
        await this.classesService.saveEntity(trainingClass);
        return this.toStatusResponse(block);
      }

      const speech = await this.ttsProvider.generateSpeech({
        text: dto.script,
        language: dto.language,
        voice: dto.voice,
        speed: dto.rate,
      });
      const key = await this.uploadsService.upload(speech.buffer, speech.mimeType, AUDIO_KEY_PREFIX);

      block.content = dto.script;
      block.label = dto.label;
      block.language = dto.language;
      block.voice = dto.voice;
      block.rate = dto.rate;
      block.audioStatus = 'ready';
      block.audioKey = key;
      block.audioProvider = this.ttsProvider.name;
      block.audioVoice = speech.voiceUsed;
      block.audioGeneratedAt = new Date().toISOString();
      block.audioScriptHash = computeScriptHash(dto.script, dto.language, dto.voice, dto.rate);
      block.audioError = undefined;

      await this.classesService.saveEntity(trainingClass);
      return this.toStatusResponse(block);
    } catch (err) {
      block.audioStatus = 'failed';
      block.audioError = err instanceof Error ? err.message : 'Voice generation failed.';
      await this.classesService.saveEntity(trainingClass);
      return this.toStatusResponse(block);
    } finally {
      this.generating.delete(blockId);
    }
  }

  private async fetchAudio(audioKey: string) {
    try {
      return await this.uploadsService.getObject(audioKey);
    } catch {
      throw new NotFoundException('Audio file not found in storage');
    }
  }

  // Admin preview — no student-side access check, just needs the JWT guard
  // already applied at the controller.
  async streamForAdmin(classId: string, blockId: string) {
    const trainingClass = await this.classesService.getEntity(classId);
    const { block } = this.findBlock(trainingClass, blockId);
    if (!block.audioKey) throw new NotFoundException('No audio generated for this block yet');
    return this.fetchAudio(block.audioKey);
  }

  // Shared by both standalone AI Teacher blocks and Guided Video cues: the
  // requesting email must be registered for this class AND the module
  // containing the block must be unlocked for that email (same check
  // RegistrationsService.register uses to decide whether to include
  // contentBlocks at all).
  private async assertStudentAccess(classId: string, moduleId: string, email: string): Promise<void> {
    const normalizedEmail = email.toLowerCase();
    const isRegistered = await this.registrationsRepo.exist({
      where: { trainingClass: { id: classId }, email: normalizedEmail },
    });
    if (!isRegistered) {
      throw new ForbiddenException('You must register for this class before accessing this lesson.');
    }

    const access = await this.submissionsService.getModuleAccess(classId, normalizedEmail);
    const moduleEntry = access.find((a) => a.moduleId === moduleId);
    // No entry means this class doesn't use module-gated progression at all
    // (e.g. no submission requirement configured) — default to allowed,
    // matching how the frontend treats a missing moduleAccess entry.
    if (moduleEntry && !moduleEntry.unlocked) {
      throw new ForbiddenException('This module is locked until the previous one is approved.');
    }
  }

  // Student playback for a standalone ai_teacher block.
  async streamForStudent(classId: string, blockId: string, email: string) {
    const trainingClass = await this.classesService.getEntity(classId);
    const { moduleId, block } = this.findBlock(trainingClass, blockId);
    if (!block.audioKey) throw new NotFoundException('No audio generated for this block yet');
    await this.assertStudentAccess(classId, moduleId, email);
    return this.fetchAudio(block.audioKey);
  }

  private toCueStatusResponse(cue: TeacherCueRecord): CueAudioStatusResponse {
    return {
      audioStatus: cue.audioStatus,
      audioProvider: cue.audioProvider,
      audioVoice: cue.audioVoice,
      audioGeneratedAt: cue.audioGeneratedAt,
      audioScriptHash: cue.audioScriptHash,
      audioError: cue.audioError,
      script: cue.script,
      language: cue.language,
      voice: cue.voice,
      rate: cue.rate,
    };
  }

  // Admin only (enforced by JwtAuthGuard at the controller). Each Guided
  // Video cue is generated and cached independently — one short audio file
  // per explanation, never one giant track for the whole video, so editing
  // or regenerating one cue never touches another's audio.
  async generateCueAudio(
    classId: string,
    blockId: string,
    cueId: string,
    dto: GenerateAudioDto,
  ): Promise<CueAudioStatusResponse> {
    const lockKey = `cue:${blockId}:${cueId}`;
    if (this.generating.has(lockKey)) {
      throw new ConflictException('Audio is already being generated for this cue — please wait.');
    }

    const trainingClass = await this.classesService.getEntity(classId);
    const { block, cue } = this.findCue(trainingClass, blockId, cueId);
    if (block.type !== 'video') {
      throw new NotFoundException('That block is not a video block');
    }

    this.generating.add(lockKey);
    try {
      cue.audioStatus = 'generating';
      cue.audioError = undefined;
      await this.classesService.saveEntity(trainingClass);

      if (!this.ttsProvider.supportsLanguage(dto.language)) {
        cue.audioStatus = 'failed';
        cue.audioError =
          'Neural voice is not available for this language yet — the browser voice will be used instead.';
        cue.script = dto.script;
        cue.language = dto.language;
        cue.voice = dto.voice;
        cue.rate = dto.rate;
        await this.classesService.saveEntity(trainingClass);
        return this.toCueStatusResponse(cue);
      }

      const speech = await this.ttsProvider.generateSpeech({
        text: dto.script,
        language: dto.language,
        voice: dto.voice,
        speed: dto.rate,
      });
      const key = await this.uploadsService.upload(speech.buffer, speech.mimeType, AUDIO_KEY_PREFIX);

      cue.script = dto.script;
      cue.language = dto.language;
      cue.voice = dto.voice;
      cue.rate = dto.rate;
      cue.audioStatus = 'ready';
      cue.audioKey = key;
      cue.audioProvider = this.ttsProvider.name;
      cue.audioVoice = speech.voiceUsed;
      cue.audioGeneratedAt = new Date().toISOString();
      cue.audioScriptHash = computeScriptHash(dto.script, dto.language, dto.voice, dto.rate);
      cue.audioError = undefined;

      await this.classesService.saveEntity(trainingClass);
      return this.toCueStatusResponse(cue);
    } catch (err) {
      cue.audioStatus = 'failed';
      cue.audioError = err instanceof Error ? err.message : 'Voice generation failed.';
      await this.classesService.saveEntity(trainingClass);
      return this.toCueStatusResponse(cue);
    } finally {
      this.generating.delete(lockKey);
    }
  }

  // Admin preview — no student-side access check, just needs the JWT guard
  // already applied at the controller.
  async streamCueForAdmin(classId: string, blockId: string, cueId: string) {
    const trainingClass = await this.classesService.getEntity(classId);
    const { cue } = this.findCue(trainingClass, blockId, cueId);
    if (!cue.audioKey) throw new NotFoundException('No audio generated for this cue yet');
    return this.fetchAudio(cue.audioKey);
  }

  // Student playback for a Guided Video cue — same registration +
  // module-unlock protection as a standalone ai_teacher block, plus the
  // cue-belongs-to-this-block check baked into findCue above.
  async streamCueForStudent(classId: string, blockId: string, cueId: string, email: string) {
    const trainingClass = await this.classesService.getEntity(classId);
    const { moduleId, cue } = this.findCue(trainingClass, blockId, cueId);
    if (!cue.audioKey) throw new NotFoundException('No audio generated for this cue yet');
    await this.assertStudentAccess(classId, moduleId, email);
    return this.fetchAudio(cue.audioKey);
  }
}
