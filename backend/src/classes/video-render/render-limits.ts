// v1 server-side limits for the Automatic Coding Video Generator. The
// frontend mirrors these for UX, but this file is the source of truth —
// generate-video.dto.ts validates individual fields against it, and
// VideoRenderService.estimateDuration re-checks the *combined* effect
// (total chars ÷ typing speed) before any canvas/ffmpeg work starts.
//
// Chosen so the real HTML test lesson (11 steps, ~650 code chars) sits
// comfortably inside every limit, while still bounding worst-case CPU time
// and render-job duration on a single shared Railway instance.

// Only one FPS/resolution is allowed in v1 (1280x720 @ 12fps, per the
// explicit "start with 720p, don't default to 1080p yet" instruction) — but
// every renderer function takes fps/width/height as parameters, never a
// hardcoded constant, specifically so widening these allowlists later needs
// no rewrite.
export const ALLOWED_FPS = [12] as const;
export const ALLOWED_RESOLUTIONS = [{ width: 1280, height: 720 }] as const;

export const MIN_TYPING_CPS = 5;
export const MAX_TYPING_CPS = 40;
export const DEFAULT_TYPING_CPS = 15; // "Normal"

export const MAX_STEPS = 40;
export const MAX_CHARS_PER_STEP = 500;
export const MAX_TOTAL_CODE_CHARS = 8000;

// Hard ceiling on the *rendered video's own* playback length — rejected
// before rendering starts (estimated from total chars ÷ cps + fixed
// lead-in/tail), not measured after the fact.
export const MAX_ESTIMATED_DURATION_SECONDS = 600; // 10 minutes

// Hard ceiling on wall-clock time the render+encode job itself may run
// (independent of the video's own duration) — protects the shared instance
// from a stuck/runaway ffmpeg process. See ffmpeg-encoder.ts.
export const MAX_RENDER_WALL_CLOCK_MS = 5 * 60 * 1000; // 5 minutes

export function isAllowedResolution(width: number, height: number): boolean {
  return ALLOWED_RESOLUTIONS.some((r) => r.width === width && r.height === height);
}
