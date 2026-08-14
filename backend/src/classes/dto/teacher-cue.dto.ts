import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { MAX_SCRIPT_LENGTH } from '../ai-teacher/dto/generate-audio.dto';

// One Guided Video Lesson explanation point: at `timestampSeconds`, the
// video pauses and the robot reads `script` aloud, then the video resumes.
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
}
