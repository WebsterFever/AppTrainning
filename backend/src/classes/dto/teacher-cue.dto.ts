import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { MAX_SCRIPT_LENGTH } from '../ai-teacher/dto/generate-audio.dto';

// Fixed set for the admin's optional code-language picker — used only for
// a small language label + monospace rendering (no syntax-highlighting
// dependency in this project), never sent to the TTS provider.
export const CUE_CODE_LANGUAGES = [
  'html',
  'css',
  'javascript',
  'typescript',
  'jsx',
  'python',
  'java',
  'csharp',
  'sql',
  'bash',
  'other',
] as const;

// One Guided Video Lesson explanation point: at `timestampSeconds`, the
// video pauses and the robot reads `script` aloud, then the video resumes.
// `code`/`codeLanguage` are an optional display-only reference to the exact
// code the explanation is about — never spoken (only `script` ever reaches
// the TTS provider, see AiTeacherService.generateCueAudio) and never part
// of computeScriptHash, so editing them never marks generated audio stale.
// Audio metadata (audioStatus/audioKey/etc.) is deliberately absent here —
// exactly like the ai_teacher block's own audio fields, it's never
// client-writable. It's only ever set by AiTeacherService.generateCueAudio
// and preserved across ordinary saves by ClassesService.withModuleIds.
export class TeacherCueDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsNumber()
  @Min(0)
  @Max(86400)
  timestampSeconds: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_SCRIPT_LENGTH)
  script: string;

  @IsOptional()
  @IsIn(['en', 'fr', 'ht'])
  language?: 'en' | 'fr' | 'ht';

  @IsOptional()
  @IsString()
  voice?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.5)
  @Max(2)
  rate?: number;

  // Optional: the exact code being discussed at this moment, shown to the
  // student in the robot panel — not spoken, not part of the lesson video
  // itself (that stays whatever the admin actually recorded).
  @IsOptional()
  @IsString()
  @MaxLength(MAX_SCRIPT_LENGTH)
  code?: string;

  @IsOptional()
  @IsIn(CUE_CODE_LANGUAGES)
  codeLanguage?: (typeof CUE_CODE_LANGUAGES)[number];
}
