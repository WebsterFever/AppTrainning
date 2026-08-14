import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsNumber, IsOptional, IsString, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { TeacherCueDto } from './teacher-cue.dto';

export const CONTENT_BLOCK_TYPES = [
  'text',
  'video',
  'heading',
  'image',
  'divider',
  'code',
  'resource',
  'exercise',
  'ai_teacher',
] as const;

export type ContentBlockType = (typeof CONTENT_BLOCK_TYPES)[number];

// All fields optional — admins can save a lesson mid-draft (e.g. a block
// with a type chosen but content not yet filled in).
export class ContentBlockDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsIn(CONTENT_BLOCK_TYPES)
  type?: ContentBlockType;

  // Body text (text/heading/code/exercise), or the URL (video/image/resource).
  // For ai_teacher, this is the lesson script the robot reads aloud — same
  // "main body" role as it plays for every other block type.
  @IsOptional()
  @IsString()
  content?: string;

  // Secondary label: video/resource title, image alt text, code language,
  // or an optional AI Teacher lesson title.
  @IsOptional()
  @IsString()
  label?: string;

  // --- ai_teacher-only fields below (ignored by every other block type) ---

  // Audience language for the lesson script — from the platform's existing
  // supported languages, not a separate translation system.
  @IsOptional()
  @IsIn(['en', 'fr', 'ht'])
  language?: 'en' | 'fr' | 'ht';

  // Best-effort browser voice name hint. The student's browser may not have
  // this exact voice installed, in which case playback falls back to the
  // closest available voice for `language` (see frontend RobotTeacher).
  @IsOptional()
  @IsString()
  voice?: string;

  // Speech rate multiplier (Web Speech API range is roughly 0.1–10; we
  // constrain to a sane, audible band).
  @IsOptional()
  @IsNumber()
  @Min(0.5)
  @Max(2)
  rate?: number;

  // Cosmetic avatar accent preset (e.g. 'amber' | 'sage' | 'coral').
  @IsOptional()
  @IsString()
  avatarStyle?: string;

  // Optional short instructions shown to the student above the script,
  // e.g. "Listen carefully, then complete the exercise below."
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  instructions?: string;

  // Whether the lesson script is also shown as readable text alongside the
  // robot (vs. an audio/voice-only experience). Undefined/omitted means
  // "show it" — the original, only behavior before this became optional —
  // so existing blocks keep working exactly as they did.
  @IsOptional()
  @IsBoolean()
  showScript?: boolean;

  // --- video-only fields below (Guided Video Lesson — ignored by every
  // other block type) ---

  // Explicit toggle, independent of whether cues exist, so an admin can
  // disable guided narration without losing their drafted cues.
  @IsOptional()
  @IsBoolean()
  guidedTeacherEnabled?: boolean;

  // Ordered by timestamp is NOT assumed — the frontend sorts for playback,
  // this is just the admin's editing order.
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TeacherCueDto)
  guidedTeacherCues?: TeacherCueDto[];
}
