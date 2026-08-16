import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Registration } from '../registrations/registration.entity';

@Entity('classes')
export class TrainingClass {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'image_url' })
  imageUrl: string;

  @Column({ type: 'varchar', name: 'video_url', nullable: true })
  videoUrl?: string | null;

  @Column({ type: 'text', name: 'video_notes', nullable: true })
  videoNotes?: string | null;

  // Downloadable resources attached to the main video. Nullable so an admin
  // can explicitly clear one (distinct from "not sent" on partial updates).
  @Column({ type: 'varchar', name: 'video_pdf_url', nullable: true })
  videoPdfUrl?: string | null;

  @Column({ type: 'varchar', name: 'video_pdf_name', nullable: true })
  videoPdfName?: string | null;

  @Column({ type: 'varchar', name: 'video_resource_image_url', nullable: true })
  videoResourceImageUrl?: string | null;

  @Column({ type: 'varchar', name: 'video_resource_image_name', nullable: true })
  videoResourceImageName?: string | null;

  @Column('simple-json', { name: 'extra_videos', nullable: true })
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

  // Optional course curriculum, shown publicly (as a marketing preview)
  // before purchase/unlock — array order is display/module order (M1, M2,
  // …), same convention as extraVideos above. Nullable/absent means "no
  // curriculum" and the whole section is hidden on the public page.
  //
  // Each topic's `contentBlocks` is the actual lesson (private content) —
  // an ordered sequence of text/video/image/etc. blocks. It's gated the
  // same way zoomLink is: stripped from public reads until the visitor
  // registers/unlocks the class (see ClassesService.toPublicShape and
  // RegistrationsService.register). Title/description stay public — that's
  // the marketing curriculum.
  @Column('simple-json', { name: 'curriculum_modules', nullable: true })
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
        // ai_teacher-only fields (see ContentBlockDto for details).
        language?: string;
        voice?: string;
        rate?: number;
        avatarStyle?: string;
        instructions?: string;
        showScript?: boolean;
        // Generated neural-voice audio for this ai_teacher block (optional
        // upgrade over the browser-only speechSynthesis fallback — see
        // AiTeacherService). `audioKey` is the private S3 object key; it's
        // never resolved to a fetchable URL for any client — playback goes
        // through a protected streaming endpoint that re-checks course
        // access by blockId instead.
        audioStatus?: 'none' | 'generating' | 'ready' | 'failed';
        audioKey?: string;
        audioProvider?: string;
        audioVoice?: string;
        audioGeneratedAt?: string;
        audioScriptHash?: string;
        audioError?: string;
        // Guided Video Lesson (video blocks only) — timestamped AI Teacher
        // explanations that pause/resume the video. Same audio-metadata
        // shape and private-key handling as the fields above, just one per
        // cue instead of one per block (see AiTeacherService).
        guidedTeacherEnabled?: boolean;
        guidedTeacherCues?: {
          id: string;
          timestampSeconds: number;
          script: string;
          language?: 'en' | 'fr' | 'ht';
          voice?: string;
          rate?: number;
          // Optional reference code shown alongside the explanation —
          // display-only, never spoken (see TeacherCueDto).
          code?: string;
          codeLanguage?: string;
          audioStatus?: 'none' | 'generating' | 'ready' | 'failed';
          audioKey?: string;
          audioProvider?: string;
          audioVoice?: string;
          audioGeneratedAt?: string;
          audioScriptHash?: string;
          audioError?: string;
        }[];
        // Automatic Coding Video Generator (video blocks only) — an
        // optional, silent, deterministically-rendered MP4 that plugs into
        // this same block's `content` slot once ready (see
        // VideoRenderService). Reuses `guidedTeacherCues` above as the
        // ordered "teaching steps" source (each cue with a non-empty `code`
        // is one typed-out step) rather than a second schema — this field
        // only carries the render job's own state/settings/output.
        // `videoKey` is the private S3 object key, handled exactly like
        // audioKey above: never resolved to a client-fetchable URL, always
        // served through a protected streaming endpoint.
        guidedVideoGeneration?: {
          status: 'idle' | 'queued' | 'rendering' | 'encoding' | 'uploading' | 'ready' | 'failed' | 'interrupted';
          error?: string;
          videoKey?: string;
          durationSeconds?: number;
          width?: number;
          height?: number;
          fps?: number;
          typingCharsPerSecond?: number;
          generatedAt?: string;
          // Fingerprint of (ordered step code, typingCharsPerSecond, fps,
          // width, height) at generation time — NOT script/voice/language/
          // rate, so editing narration never stales the video (see
          // computeVideoContentHash).
          contentHash?: string;
        };
      }[];
    }[];
  }[];

  // Optional: paid classes may not have a fixed live session (e.g. self-paced content).
  @Column({ name: 'class_date', type: 'timestamptz', nullable: true })
  classDate?: Date;

  @Column({ type: 'varchar', name: 'zoom_link', nullable: true })
  zoomLink?: string | null;

  @Column({ name: 'is_past', default: false })
  isPast: boolean;

  @Column({ name: 'is_paid', default: false })
  isPaid: boolean;

  // Target-audience language the admin taught/uploaded this class in.
  // Nullable so existing classes (created before this field existed) keep
  // showing up regardless of which language a visitor has selected.
  @Column({ type: 'varchar', name: 'language', nullable: true })
  language?: 'en' | 'fr' | 'ht' | null;

  // In cents (USD). Nullable so an existing paid class can predate pricing
  // — without it, the self-serve "Pay now" button is hidden and the class
  // falls back to the admin manually granting access via allowedEmails.
  @Column({ type: 'integer', name: 'price_cents', nullable: true })
  priceCents?: number | null;

  // Admin-managed allowlist: only these emails can register for a paid class.
  // Populated either by the admin manually, or automatically once a Stripe
  // payment for that email completes (see PaymentsService).
  @Column('simple-json', { name: 'allowed_emails', nullable: true })
  allowedEmails?: string[];

  @OneToMany(() => Registration, (registration) => registration.trainingClass)
  registrations: Registration[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
