import type { Language, TranslationKey } from './i18n';

export function formatCountdown(
  classDate: string,
  now: Date,
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string,
  language: Language = 'en',
): string {
  const diffMs = new Date(classDate).getTime() - now.getTime();
  if (diffMs <= 0) return t('startingNow');
  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];
  if (language === 'ht') {
    if (days) parts.push(`${days} jou`);
    if (days || hours) parts.push(`${hours} hr`);
    parts.push(`${minutes} mn`);
  } else if (language === 'fr') {
    if (days) parts.push(`${days} j`);
    if (days || hours) parts.push(`${hours} h`);
    parts.push(`${minutes} min`);
  } else {
    if (days) parts.push(`${days}d`);
    if (days || hours) parts.push(`${hours}h`);
    parts.push(`${minutes}m`);
  }
  return t('startsIn', { parts: parts.join(' ') });
}
