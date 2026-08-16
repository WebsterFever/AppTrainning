import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { ClassesService } from '../classes.service';
import { TrainingClass } from '../class.entity';
import { UploadsService } from '../../uploads/uploads.service';
import { CourseAccessService } from '../course-access/course-access.service';
import { GenerateVideoDto } from './dto/generate-video.dto';
import { computeTimeline, TimelineStep } from './render-timeline';
import { renderFrame } from './frame-renderer';
import { encodeFramesToMp4 } from './ffmpeg-encoder';
import { computeVideoContentHash } from './video-content-hash';
import {
  MAX_CHARS_PER_STEP,
  MAX_ESTIMATED_DURATION_SECONDS,
  MAX_STEPS,
  MAX_TOTAL_CODE_CHARS,
  isAllowedResolution,
} from './render-limits';

type ContentBlockRecord = NonNullable<
  NonNullable<TrainingClass['curriculumModules']>[number]['topics'][number]['contentBlocks']
>[number];
type VideoGeneration = NonNullable<ContentBlockRecord['guidedVideoGeneration']>;
type VideoGenerationStatus = VideoGeneration['status'];

interface BlockLocation {
  trainingClass: TrainingClass;
  moduleId: string;
  block: ContentBlockRecord;
}

export interface VideoStatusResponse {
  status: VideoGenerationStatus;
  error?: string;
  durationSeconds?: number;
  width?: number;
  height?: number;
  fps?: number;
  typingCharsPerSecond?: number;
  generatedAt?: string;
  videoStale?: boolean;
  cueCount?: number;
}

const VIDEO_KEY_PREFIX = 'guided-video-render';
const IN_PROGRESS_STATUSES: VideoGenerationStatus[] = ['queued', 'rendering', 'encoding', 'uploading'];

@Injectable()
export class VideoRenderService implements OnModuleInit {
  private readonly logger = new Logger(VideoRenderService.name);

  // Per-block dedup, same pattern as AiTeacherService.generating.
  private readonly generatingBlocks = new Set<string>();
  // v1 concurrency model: only one render job runs at a time, process-wide.
  // A second concurrent request for a *different* block is rejected
  // outright (409) rather than silently queued — simpler to reason about
  // correctly than a real queue, and honest about the boundary rather than
  // pretending unbounded concurrent rendering is safe on a single shared
  // Railway instance. See the written report for why a proper queue is a
  // reasonable next step, not a v1 requirement.
  private globalRenderInProgress = false;

  constructor(
    private readonly classesService: ClassesService,
    private readonly uploadsService: UploadsService,
    private readonly courseAccessService: CourseAccessService,
  ) {}

  // Runs once per process boot. v1 has no durable queue — the
  // `generatingBlocks`/`globalRenderInProgress` locks above are in-memory
  // and empty on a fresh process, so any block still showing
  // queued/rendering/encoding/uploading at this point was, by definition,
  // interrupted by the previous process ending (deploy, crash, restart)
  // mid-job. Mark it rather than leaving it stuck forever or silently
  // re-starting an expensive render without admin action.
  async onModuleInit(): Promise<void> {
    try {
      const classes = await this.classesService.getAllEntitiesRaw();
      let recovered = 0;
      for (const trainingClass of classes) {
        let changed = false;
        const sweepBlocks = (blocks?: ContentBlockRecord[]) => {
          for (const block of blocks ?? []) {
            const gen = block.guidedVideoGeneration;
            if (gen && IN_PROGRESS_STATUSES.includes(gen.status)) {
              gen.status = 'interrupted';
              gen.error = 'Video generation was interrupted by a server restart. Please generate the video again.';
              changed = true;
              recovered++;
            }
          }
        };
        for (const mod of trainingClass.curriculumModules ?? []) {
          for (const topic of mod.topics ?? []) {
            sweepBlocks(topic.contentBlocks);
            for (const subtopic of topic.subtopics ?? []) {
              sweepBlocks(subtopic.contentBlocks);
            }
          }
        }
        if (changed) await this.classesService.saveEntity(trainingClass);
      }
      if (recovered > 0) {
        this.logger.warn(`Marked ${recovered} orphaned video generation job(s) as interrupted after restart.`);
      }
    } catch (err) {
      // Never let a startup sweep failure prevent the app from booting.
      this.logger.error('Failed to sweep for interrupted video generation jobs on startup', err as Error);
    }
  }

  private findBlock(trainingClass: TrainingClass, blockId: string): BlockLocation {
    for (const mod of trainingClass.curriculumModules ?? []) {
      for (const topic of mod.topics ?? []) {
        const block = topic.contentBlocks?.find((b) => b.id === blockId);
        if (block) return { trainingClass, moduleId: mod.id, block };
        // A block may also live one level deeper, inside a subtopic —
        // see class.entity.ts's TopicLikeRecord for the shape.
        for (const subtopic of topic.subtopics ?? []) {
          const subtopicBlock = subtopic.contentBlocks?.find((b) => b.id === blockId);
          if (subtopicBlock) return { trainingClass, moduleId: mod.id, block: subtopicBlock };
        }
      }
    }
    throw new NotFoundException('Content block not found');
  }

  private toStatusResponse(block: ContentBlockRecord): VideoStatusResponse {
    const gen = block.guidedVideoGeneration;
    const cueCount = block.guidedTeacherCues?.filter((c) => c.code?.trim()).length ?? 0;
    if (!gen) return { status: 'idle', cueCount };
    return {
      status: gen.status,
      error: gen.error,
      durationSeconds: gen.durationSeconds,
      width: gen.width,
      height: gen.height,
      fps: gen.fps,
      typingCharsPerSecond: gen.typingCharsPerSecond,
      generatedAt: gen.generatedAt,
      cueCount,
    };
  }

  async getStatus(classId: string, blockId: string): Promise<VideoStatusResponse> {
    const trainingClass = await this.classesService.getEntity(classId);
    const { block } = this.findBlock(trainingClass, blockId);
    return this.toStatusResponse(block);
  }

  // Admin only (enforced by JwtAuthGuard at the controller). Validates,
  // persists status='queued', and returns immediately — the actual
  // rendering happens in the background (see runRenderJob), never inside
  // this HTTP request/response cycle. Reuses block.guidedTeacherCues as the
  // ordered step source (every cue with non-empty `code`, in array order)
  // instead of a second "teaching steps" schema.
  async generateVideo(classId: string, blockId: string, dto: GenerateVideoDto): Promise<VideoStatusResponse> {
    if (this.generatingBlocks.has(blockId)) {
      throw new ConflictException('This video is already being generated — please wait.');
    }
    if (this.globalRenderInProgress) {
      throw new ConflictException(
        'Another video is currently being generated. Please wait for it to finish before starting another.',
      );
    }

    const trainingClass = await this.classesService.getEntity(classId);
    const { block } = this.findBlock(trainingClass, blockId);
    if (block.type !== 'video') {
      throw new BadRequestException('That block is not a video block');
    }

    const steps: TimelineStep[] = (block.guidedTeacherCues ?? [])
      .filter((c) => c.code?.trim())
      .map((c) => ({ cueId: c.id, code: c.code as string }));

    if (steps.length === 0) {
      throw new BadRequestException(
        'No teaching steps have code yet. Add at least one Guided Teacher cue with a "Code being explained" value before generating a video.',
      );
    }
    if (steps.length > MAX_STEPS) {
      throw new BadRequestException(`Too many teaching steps (${steps.length}). The v1 limit is ${MAX_STEPS}.`);
    }
    const tooLong = steps.find((s) => s.code.length > MAX_CHARS_PER_STEP);
    if (tooLong) {
      throw new BadRequestException(
        `One teaching step's code is too long (${tooLong.code.length} characters). The v1 limit per step is ${MAX_CHARS_PER_STEP}.`,
      );
    }
    const totalChars = steps.reduce((sum, s) => sum + s.code.length, 0);
    if (totalChars > MAX_TOTAL_CODE_CHARS) {
      throw new BadRequestException(
        `Total code across all steps is too long (${totalChars} characters). The v1 limit is ${MAX_TOTAL_CODE_CHARS}.`,
      );
    }
    if (!isAllowedResolution(dto.width, dto.height)) {
      throw new BadRequestException(`${dto.width}x${dto.height} is not an allowed resolution in v1.`);
    }

    // Reject an oversized render (estimated from step lengths ÷ typing
    // speed) *before* any canvas/ffmpeg work starts — never discovered only
    // after minutes of CPU time have already been spent.
    const timeline = computeTimeline(steps, dto.typingCharsPerSecond, dto.fps);
    if (timeline.durationSeconds > MAX_ESTIMATED_DURATION_SECONDS) {
      throw new BadRequestException(
        `Estimated video duration (${Math.round(timeline.durationSeconds)}s) exceeds the v1 limit of ${MAX_ESTIMATED_DURATION_SECONDS}s. Reduce the amount of code or increase typing speed.`,
      );
    }

    block.guidedVideoGeneration = {
      status: 'queued',
      error: undefined,
      videoKey: block.guidedVideoGeneration?.videoKey,
      width: dto.width,
      height: dto.height,
      fps: dto.fps,
      typingCharsPerSecond: dto.typingCharsPerSecond,
    };
    await this.classesService.saveEntity(trainingClass);

    this.generatingBlocks.add(blockId);
    this.globalRenderInProgress = true;
    // Deliberately not awaited — the HTTP handler returns as soon as this
    // function returns, the render runs on its own after that.
    this.runRenderJob(classId, blockId, steps, dto).catch((err) => {
      this.logger.error(`Unhandled error in video render job for block ${blockId}`, err as Error);
    });

    return this.toStatusResponse(block);
  }

  private async runRenderJob(
    classId: string,
    blockId: string,
    steps: TimelineStep[],
    dto: GenerateVideoDto,
  ): Promise<void> {
    let framesDir: string | null = null;
    try {
      framesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'coding-video-'));

      await this.updateGeneration(classId, blockId, (gen) => {
        gen.status = 'rendering';
      });

      const timeline = computeTimeline(steps, dto.typingCharsPerSecond, dto.fps);
      const codeLanguage = await this.resolveCodeLanguage(classId, blockId);
      const title = await this.resolveTitle(classId, blockId);

      for (let f = 0; f < timeline.totalFrames; f++) {
        const revealed = timeline.fullText.slice(0, timeline.revealedCharsAtFrame(f));
        const png = renderFrame({
          width: dto.width,
          height: dto.height,
          revealedText: revealed,
          title,
          frameIndex: f,
          codeLanguage,
        });
        // Awaiting an async write yields the event loop between frames,
        // so a long render doesn't monopolize it in one unbroken
        // synchronous burst — normal API requests still get serviced
        // between frames, just not truly in parallel (Node is
        // single-threaded; this bounds the damage, it doesn't eliminate
        // it — see the written report).
        await fs.promises.writeFile(path.join(framesDir, `frame_${String(f).padStart(6, '0')}.png`), png);
      }

      await this.updateGeneration(classId, blockId, (gen) => {
        gen.status = 'encoding';
      });

      const outputPath = path.join(framesDir, 'output.mp4');
      await encodeFramesToMp4({
        framesDir,
        framePattern: 'frame_%06d.png',
        fps: dto.fps,
        outputPath,
      });

      await this.updateGeneration(classId, blockId, (gen) => {
        gen.status = 'uploading';
      });

      const videoBuffer = await fs.promises.readFile(outputPath);
      const videoKey = await this.uploadsService.upload(videoBuffer, 'video/mp4', VIDEO_KEY_PREFIX);

      const contentHash = computeVideoContentHash(
        steps.map((s) => s.code),
        dto.typingCharsPerSecond,
        dto.fps,
        dto.width,
        dto.height,
      );

      await this.updateGeneration(classId, blockId, (gen, block) => {
        gen.status = 'ready';
        gen.error = undefined;
        gen.videoKey = videoKey;
        gen.durationSeconds = timeline.durationSeconds;
        gen.width = dto.width;
        gen.height = dto.height;
        gen.fps = dto.fps;
        gen.typingCharsPerSecond = dto.typingCharsPerSecond;
        gen.generatedAt = new Date().toISOString();
        gen.contentHash = contentHash;

        // Write back exactly the timestamps the render computed — every
        // other cue field (script/code/codeLanguage/voice/language/rate/
        // audio*) is left completely untouched.
        for (const cue of block.guidedTeacherCues ?? []) {
          const finishFrame = timeline.stepFinishFrame.get(cue.id);
          if (finishFrame !== undefined) {
            cue.timestampSeconds = finishFrame / dto.fps;
          }
        }
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Video generation failed.';
      this.logger.error(`Video render failed for block ${blockId}: ${message}`);
      try {
        await this.updateGeneration(classId, blockId, (gen) => {
          gen.status = 'failed';
          gen.error = message;
        });
      } catch (persistErr) {
        this.logger.error('Failed to persist failure status', persistErr as Error);
      }
    } finally {
      this.generatingBlocks.delete(blockId);
      this.globalRenderInProgress = false;
      if (framesDir) {
        // Runs on success, ffmpeg failure, upload failure, and any
        // unexpected exception — never leaves rendered PNG frames or the
        // intermediate MP4 behind on disk.
        fs.rm(framesDir, { recursive: true, force: true }, (err) => {
          if (err) this.logger.warn(`Failed to clean up temp render dir ${framesDir}: ${err.message}`);
        });
      }
    }
  }

  private async resolveCodeLanguage(classId: string, blockId: string): Promise<string> {
    const trainingClass = await this.classesService.getEntity(classId);
    const { block } = this.findBlock(trainingClass, blockId);
    const firstWithLanguage = block.guidedTeacherCues?.find((c) => c.codeLanguage);
    return firstWithLanguage?.codeLanguage ?? 'other';
  }

  private async resolveTitle(classId: string, blockId: string): Promise<string | undefined> {
    const trainingClass = await this.classesService.getEntity(classId);
    const { block } = this.findBlock(trainingClass, blockId);
    return block.label;
  }

  // Re-fetches the entity fresh, applies `mutate` to its
  // guidedVideoGeneration (creating it if needed) and to the block itself,
  // and saves — used for every status transition during a render so a
  // concurrent admin "Save changes" on unrelated fields can't be clobbered
  // by a stale in-memory copy held across the whole (potentially
  // multi-second) render job.
  private async updateGeneration(
    classId: string,
    blockId: string,
    mutate: (gen: VideoGeneration, block: ContentBlockRecord) => void,
  ): Promise<void> {
    const trainingClass = await this.classesService.getEntity(classId);
    const { block } = this.findBlock(trainingClass, blockId);
    if (!block.guidedVideoGeneration) {
      block.guidedVideoGeneration = { status: 'queued' };
    }
    mutate(block.guidedVideoGeneration, block);
    await this.classesService.saveEntity(trainingClass);
  }

  private async fetchVideo(videoKey: string) {
    try {
      return await this.uploadsService.getObject(videoKey);
    } catch {
      throw new NotFoundException('Video file not found in storage');
    }
  }

  // Admin preview — no student-side access check, just needs the JWT guard
  // already applied at the controller.
  async streamForAdmin(classId: string, blockId: string) {
    const trainingClass = await this.classesService.getEntity(classId);
    const { block } = this.findBlock(trainingClass, blockId);
    const videoKey = block.guidedVideoGeneration?.videoKey;
    if (!videoKey) throw new NotFoundException('No video generated for this block yet');
    return this.fetchVideo(videoKey);
  }

  // Student playback — same registration + module-unlock protection as
  // standalone AI Teacher audio and Guided Video cue audio.
  async streamForStudent(classId: string, blockId: string, email: string) {
    const trainingClass = await this.classesService.getEntity(classId);
    const { moduleId, block } = this.findBlock(trainingClass, blockId);
    const videoKey = block.guidedVideoGeneration?.videoKey;
    if (!videoKey) throw new NotFoundException('No video generated for this block yet');
    await this.courseAccessService.assertStudentAccess(classId, moduleId, email);
    return this.fetchVideo(videoKey);
  }

  // Admin only — removes the generated video (S3 object + block state) so
  // the admin can cleanly regenerate, without a stale "ready" video
  // lingering if they decide to start over. Leaves cue timestamps as-is —
  // deleting the video doesn't force-discard timestamps the admin may
  // still want to keep/review.
  async deleteVideo(classId: string, blockId: string): Promise<VideoStatusResponse> {
    if (this.generatingBlocks.has(blockId)) {
      throw new ConflictException('Cannot delete a video while it is being generated.');
    }
    const trainingClass = await this.classesService.getEntity(classId);
    const { block } = this.findBlock(trainingClass, blockId);
    const videoKey = block.guidedVideoGeneration?.videoKey;
    block.guidedVideoGeneration = undefined;
    await this.classesService.saveEntity(trainingClass);

    if (videoKey) {
      try {
        await this.uploadsService.deleteObject(videoKey);
      } catch (err) {
        this.logger.warn(`Failed to delete S3 object ${videoKey}: ${(err as Error).message}`);
      }
    }

    return this.toStatusResponse(block);
  }
}
