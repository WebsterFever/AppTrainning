const nyFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

function getNyParts(date: Date) {
  const parts: Record<string, string> = {};
  nyFormatter.formatToParts(date).forEach((p) => {
    if (p.type !== 'literal') parts[p.type] = p.value;
  });
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parseInt(parts.hour, 10) % 24, // hour12:false can report "24" at midnight
    minute: parseInt(parts.minute, 10),
    second: parseInt(parts.second, 10),
  };
}

// Finds the UTC instant that displays as 12:00:00 in New York on the given
// NY calendar date, correcting for DST by iterating a couple of times.
function nyNoonForDate(nyDateStr: string): Date {
  let guess = new Date(`${nyDateStr}T12:00:00Z`);
  for (let i = 0; i < 3; i++) {
    const p = getNyParts(guess);
    const deltaMs = ((12 - p.hour) * 3600 + -p.minute * 60 + -p.second) * 1000;
    if (deltaMs === 0) break;
    guess = new Date(guess.getTime() + deltaMs);
  }
  return guess;
}

// The next upcoming 12:00 PM America/New_York instant, strictly after `now`.
export function getNextQuestionTime(now: Date = new Date()): Date {
  const today = getNyParts(now);
  const todayStr = `${today.year}-${today.month}-${today.day}`;
  const todayNoon = nyNoonForDate(todayStr);
  if (todayNoon.getTime() > now.getTime()) return todayNoon;

  const tomorrow = getNyParts(new Date(now.getTime() + 24 * 3600 * 1000));
  const tomorrowStr = `${tomorrow.year}-${tomorrow.month}-${tomorrow.day}`;
  return nyNoonForDate(tomorrowStr);
}

export function formatCountdown(target: Date, now: Date): string {
  const diffMs = target.getTime() - now.getTime();
  if (diffMs <= 0) return 'any moment now';
  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts: string[] = [];
  if (hours) parts.push(`${hours}h`);
  if (hours || minutes) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);
  return parts.join(' ');
}
