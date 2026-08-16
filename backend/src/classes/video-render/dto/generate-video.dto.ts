import { IsIn, IsNumber, Max, Min } from 'class-validator';
import { ALLOWED_FPS, MAX_TYPING_CPS, MIN_TYPING_CPS } from '../render-limits';

// The admin's teaching-step *content* already lives on the block's
// guidedTeacherCues (code/script/codeLanguage) — this request only carries
// the render-specific settings that aren't part of that existing schema.
// Resolution is intentionally not a free field yet: only one is allowed in
// v1 (see render-limits.ts), enforced in the service, not duplicated here.
export class GenerateVideoDto {
  @IsNumber()
  @Min(MIN_TYPING_CPS)
  @Max(MAX_TYPING_CPS)
  typingCharsPerSecond: number;

  @IsIn(ALLOWED_FPS)
  fps: number;

  @IsNumber()
  width: number;

  @IsNumber()
  height: number;
}
