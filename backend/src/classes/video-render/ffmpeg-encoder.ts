import { spawn } from 'child_process';
import * as path from 'path';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ffmpegPath: string | null = require('ffmpeg-static');
import { MAX_RENDER_WALL_CLOCK_MS } from './render-limits';

export interface EncodeOptions {
  /** Directory containing the numbered PNG frame sequence. */
  framesDir: string;
  /** e.g. 'frame_%05d.png' */
  framePattern: string;
  fps: number;
  outputPath: string;
  timeoutMs?: number;
}

export interface EncodeResult {
  /** Last portion of ffmpeg's stderr — diagnostics only, never includes env vars. */
  stderrTail: string;
}

const STDERR_CAP = 50_000;

// Encodes a numbered PNG sequence into a silent H.264/yuv420p MP4. Invoked
// via `spawn` with an explicit argument array (never a shell string), so
// nothing here is vulnerable to shell injection regardless of what the
// admin's code/title text contains — none of it ever reaches this command
// line in the first place (frame content is baked into PNG bytes already,
// not passed as CLI text).
export function encodeFramesToMp4(opts: EncodeOptions): Promise<EncodeResult> {
  const { framesDir, framePattern, fps, outputPath, timeoutMs = MAX_RENDER_WALL_CLOCK_MS } = opts;
  if (!ffmpegPath) {
    return Promise.reject(new Error('ffmpeg-static did not resolve a binary for this platform'));
  }

  const args = [
    '-y',
    '-framerate', String(fps),
    '-i', path.join(framesDir, framePattern),
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    '-an',
    outputPath,
  ];

  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath as string, args, { windowsHide: true });
    let stderrBuf = '';
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill('SIGKILL');
      reject(new Error(`ffmpeg render exceeded ${timeoutMs}ms and was killed`));
    }, timeoutMs);

    child.stderr?.on('data', (chunk: Buffer) => {
      stderrBuf += chunk.toString();
      if (stderrBuf.length > STDERR_CAP) stderrBuf = stderrBuf.slice(-STDERR_CAP);
    });

    child.on('error', (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(err);
    });

    child.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      const tail = stderrBuf.split('\n').slice(-30).join('\n');
      if (code === 0) {
        resolve({ stderrTail: tail });
      } else {
        reject(new Error(`ffmpeg exited with code ${code}\n${tail}`));
      }
    });
  });
}

// Probes basic stream info (duration/resolution/has-audio) by parsing
// ffmpeg's own stderr banner for the file — avoids depending on ffprobe,
// which ffmpeg-static does not bundle.
export function probeMp4(filePath: string): Promise<{ raw: string }> {
  if (!ffmpegPath) return Promise.reject(new Error('ffmpeg-static did not resolve a binary for this platform'));
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath as string, ['-i', filePath, '-hide_banner'], { windowsHide: true });
    let buf = '';
    child.stderr?.on('data', (c: Buffer) => (buf += c.toString()));
    child.on('error', reject);
    child.on('close', () => resolve({ raw: buf }));
  });
}
