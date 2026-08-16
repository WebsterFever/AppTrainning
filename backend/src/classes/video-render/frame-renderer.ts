import { GlobalFonts, createCanvas } from '@napi-rs/canvas';
import * as path from 'path';
import { tokenizeHtml, ColoredSpan, TokenColor } from './html-tokenizer';

// Generic dark editor palette — visually distinct from any specific
// editor's default theme (not VS Code's Dark+ palette), just a clean,
// professional dark-code-editor look.
const BG = '#1a1b26';
const TOP_BAR_BG = '#16161e';
const TITLE_COLOR = '#7c7f93';
const LINE_NUMBER_COLOR = '#4a4d63';
const CURSOR_COLOR = '#c8ccd4';
const TOKEN_COLORS: Record<TokenColor, string> = {
  bracket: '#8a8a9e',
  tagname: '#7aa2f7',
  attrname: '#9ece6a',
  attrvalue: '#e0af68',
  comment: '#565f89',
  punct: '#8a8a9e',
  text: '#c8ccd4',
};

// ~0.5s blink cycle at the v1 12fps default — deterministic (frame-index
// driven), not time-based, so identical input always renders identical
// frames.
const BLINK_FRAMES = 6;

let fontsRegistered = false;
function ensureFontsRegistered(): void {
  if (fontsRegistered) return;
  const dir = path.join(process.cwd(), 'assets', 'fonts');
  GlobalFonts.registerFromPath(path.join(dir, 'JetBrainsMono-Regular.ttf'), 'Coding Video Mono');
  fontsRegistered = true;
}

function tokenizeLine(lineText: string, codeLanguage: string): ColoredSpan[] {
  // Only HTML gets real tokenization in v1 (see html-tokenizer.ts) — any
  // other language still renders correctly, just as plain single-color
  // text, rather than failing or guessing at unfamiliar syntax.
  if (codeLanguage === 'html') return tokenizeHtml(lineText);
  return lineText ? [{ text: lineText, color: 'text' }] : [];
}

export interface RenderFrameOptions {
  width: number;
  height: number;
  /** Text revealed so far this frame (a prefix of the full joined code). */
  revealedText: string;
  title?: string;
  frameIndex: number;
  codeLanguage: string;
}

// Renders one deterministic frame of the coding-editor animation as a PNG
// buffer. Pure function of its inputs — same options always produce
// byte-identical output, which is what makes the whole render job
// reproducible and the resulting cue timestamps trustworthy.
export function renderFrame(opts: RenderFrameOptions): Buffer {
  ensureFontsRegistered();
  const { width, height, revealedText, title, frameIndex, codeLanguage } = opts;

  // Every size below is proportional to this scale factor (relative to the
  // 1280x720 v1 baseline) so a future 1080p option needs no layout rework.
  const scale = width / 1280;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const topBarHeight = Math.round(48 * scale);
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = TOP_BAR_BG;
  ctx.fillRect(0, 0, width, topBarHeight);

  const fontSize = Math.round(22 * scale);
  if (title) {
    ctx.font = `${Math.round(15 * scale)}px "Coding Video Mono"`;
    ctx.fillStyle = TITLE_COLOR;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText(title, Math.round(20 * scale), Math.round(topBarHeight / 2));
  }

  const lineHeight = Math.round(fontSize * 1.5);
  const gutterWidth = Math.round(64 * scale);
  const leftPad = Math.round(20 * scale);
  const topPad = Math.round(20 * scale);
  const rightPad = Math.round(20 * scale);
  const bottomPad = Math.round(20 * scale);
  const codeAreaX = gutterWidth + leftPad;
  const codeAreaY = topBarHeight + topPad;
  const codeAreaHeight = height - codeAreaY - bottomPad;

  ctx.font = `${fontSize}px "Coding Video Mono"`;
  ctx.textBaseline = 'top';

  const lines = revealedText.split('\n');
  const visibleLineCount = Math.max(1, Math.floor(codeAreaHeight / lineHeight));
  const currentLineIndex = lines.length - 1;
  // Keep the actively-typed line in view: once content exceeds the visible
  // area, scroll down by whole lines so the current line is always the
  // last visible one — same idea as a real editor's "scroll on typing",
  // computed purely from the revealed text, no timers involved.
  const scrollOffset = Math.max(0, currentLineIndex - visibleLineCount + 1);

  // Clip to the editor body so an unusually long line (no horizontal
  // scroll in v1) or a scroll-edge rounding case can never draw outside
  // the intended region.
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, topBarHeight, width, height - topBarHeight);
  ctx.clip();
  ctx.rect(0, topBarHeight, width - rightPad, height - topBarHeight);

  for (let row = 0; row < visibleLineCount; row++) {
    const lineIdx = scrollOffset + row;
    if (lineIdx >= lines.length) break;
    const y = codeAreaY + row * lineHeight;

    ctx.fillStyle = LINE_NUMBER_COLOR;
    ctx.textAlign = 'right';
    ctx.fillText(String(lineIdx + 1), gutterWidth - Math.round(12 * scale), y);
    ctx.textAlign = 'left';

    const lineText = lines[lineIdx];
    const spans = tokenizeLine(lineText, codeLanguage);
    let x = codeAreaX;
    for (const span of spans) {
      ctx.fillStyle = TOKEN_COLORS[span.color];
      ctx.fillText(span.text, x, y);
      x += ctx.measureText(span.text).width;
    }

    if (lineIdx === currentLineIndex) {
      const blinkOn = Math.floor(frameIndex / BLINK_FRAMES) % 2 === 0;
      if (blinkOn) {
        ctx.fillStyle = CURSOR_COLOR;
        ctx.fillRect(x, y + Math.round(2 * scale), Math.max(2, Math.round(2 * scale)), fontSize);
      }
    }
  }

  ctx.restore();

  return canvas.toBuffer('image/png');
}
