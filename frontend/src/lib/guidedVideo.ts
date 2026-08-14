// Friendly "MM:SS" (or "H:MM:SS" past an hour) <-> seconds conversion for
// Guided Video Lesson cue timestamps — admin-facing only; the API always
// carries/returns plain seconds.
export function parseClockTimestamp(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^\d+$/.test(trimmed)) return parseInt(trimmed, 10);

  const parts = trimmed.split(':').map((p) => p.trim());
  if (parts.length < 2 || parts.length > 3 || parts.some((p) => !/^\d+$/.test(p))) return null;

  const nums = parts.map((p) => parseInt(p, 10));
  const seconds = parts.length === 3 ? nums[0] * 3600 + nums[1] * 60 + nums[2] : nums[0] * 60 + nums[1];
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : null;
}

export function formatClockTimestamp(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}
