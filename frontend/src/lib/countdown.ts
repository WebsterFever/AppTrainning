import type { Language, TranslationKey } from './i18n';

export function formatCountdown(
  classDate: string,
  now: Date,
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string,
  language: Language = 'en',
): string {
  const diffMs = new Date(classDate).getTime() - now.getTime();
  if (diffMs <= 0) return t('startingNow');
  const totalSeconds = Math.ceil(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts: string[] = [];
  if (language === 'ht') {
    if (days) parts.push(`${days} jou`);
    if (days || hours) parts.push(`${hours} hr`);
    parts.push(`${minutes} mn`);
    parts.push(`${seconds} seg`);
  } else if (language === 'fr') {
    if (days) parts.push(`${days} j`);
    if (days || hours) parts.push(`${hours} h`);
    parts.push(`${minutes} min`);
    parts.push(`${seconds} s`);
  } else {
    if (days) parts.push(`${days}d`);
    if (days || hours) parts.push(`${hours}h`);
    parts.push(`${minutes}m`);
    parts.push(`${seconds}s`);
  }
  return t('startsIn', { parts: parts.join(' ') });
}
