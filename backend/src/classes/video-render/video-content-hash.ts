import { createHash } from 'crypto';

// Fingerprints exactly the inputs that affect the *rendered video itself*:
// each step's code (in order), typing speed, fps, and resolution.
// Deliberately excludes script/voice/language/rate — those only affect
// narration audio, generated completely independently (see
// AiTeacherService.generateCueAudio) — so editing a teacher explanation,
// regenerating a voice, or changing speech speed never marks the coding
// video stale. Mirrors ai-teacher/script-hash.ts's same computed-on-read
// approach: called both at generation time (to stamp the block) and at
// read time (to detect an edit since the last render).
export function computeVideoContentHash(
  stepsCode: string[],
  typingCharsPerSecond: number,
  fps: number,
  width: number,
  height: number,
): string {
  return createHash('sha256')
    .update(JSON.stringify({ stepsCode, typingCharsPerSecond, fps, width, height }))
    .digest('hex');
}
