// Pure, deterministic frame/timestamp math for the coding-video renderer.
// No randomness anywhere — the same steps + typingCharsPerSecond + fps
// always produce the exact same frame count and cue timestamps, which is
// what lets Guided Video cue timestamps be trusted without re-review after
// every regeneration.
//
// Design: all steps' code is treated as one continuously-typed document
// (joined by '\n'), typed at a constant fractional chars-per-frame rate.
// A step's cue timestamp is simply the frame at which the running
// character count first reaches the end of that step's code — there is no
// separate "pause" baked into the video itself, because the *player*
// (GuidedVideoTeacher) is what pauses playback at that timestamp; the raw
// MP4 timeline just keeps typing straight through into the next step.

export interface TimelineStep {
  cueId: string;
  code: string;
}

export interface Timeline {
  totalFrames: number;
  durationSeconds: number;
  fullText: string;
  leadInFrames: number;
  /** cueId -> 0-based frame index at which that step's code finishes typing */
  stepFinishFrame: Map<string, number>;
  /** How many characters of fullText are revealed at a given 0-based frame. */
  revealedCharsAtFrame(frameIndex: number): number;
}

// Fixed, non-configurable in v1 — deliberately small and constant so they
// never introduce per-render variability of their own.
export const LEAD_IN_SECONDS = 0.5;
export const TAIL_HOLD_SECONDS = 1.0;

export function computeTimeline(
  steps: TimelineStep[],
  typingCharsPerSecond: number,
  fps: number,
): Timeline {
  const fullText = steps.map((s) => s.code).join('\n');
  const leadInFrames = Math.round(LEAD_IN_SECONDS * fps);
  const tailFrames = Math.round(TAIL_HOLD_SECONDS * fps);
  const charsPerFrame = typingCharsPerSecond / fps;

  const cumulativeLengths: number[] = [];
  let acc = 0;
  steps.forEach((s, i) => {
    if (i > 0) acc += 1; // '\n' separator between steps
    acc += s.code.length;
    cumulativeLengths.push(acc);
  });
  const totalChars = acc;

  // Smallest frame count whose typing progress covers every character.
  // The tiny epsilon guards against float division landing just under an
  // exact integer boundary (e.g. 90/15 computing as 5.999999999998).
  const framesFor = (chars: number) => (chars > 0 ? Math.ceil(chars / charsPerFrame - 1e-9) : 0);
  const typingFrames = framesFor(totalChars);
  const totalFrames = Math.max(1, leadInFrames + typingFrames + tailFrames);

  function revealedCharsAtFrame(frameIndex: number): number {
    if (frameIndex < leadInFrames) return 0;
    const revealed = Math.floor((frameIndex - leadInFrames) * charsPerFrame + 1e-9);
    return Math.min(totalChars, Math.max(0, revealed));
  }

  const stepFinishFrame = new Map<string, number>();
  steps.forEach((s, i) => {
    const finishFrame = Math.min(totalFrames - 1, leadInFrames + framesFor(cumulativeLengths[i]));
    stepFinishFrame.set(s.cueId, finishFrame);
  });

  return {
    totalFrames,
    durationSeconds: totalFrames / fps,
    fullText,
    leadInFrames,
    stepFinishFrame,
    revealedCharsAtFrame,
  };
}

export function estimateDurationSeconds(
  steps: TimelineStep[],
  typingCharsPerSecond: number,
  fps: number,
): number {
  return computeTimeline(steps, typingCharsPerSecond, fps).durationSeconds;
}
