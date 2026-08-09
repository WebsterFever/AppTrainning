import type { TranslationKey } from './i18n';

export function formatCountdown(
  classDate: string,
  now: Date,
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string,
): string {
  const diffMs = new Date(classDate).getTime() - now.getTime();
  if (diffMs <= 0) return t('startingNow');
  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];
  if (days) parts.push(`${days}d`);
  if (days || hours) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);
  return t('startsIn', { parts: parts.join(' ') });
}
