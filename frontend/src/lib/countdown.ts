export function formatCountdown(classDate: string, now: Date): string {
  const diffMs = new Date(classDate).getTime() - now.getTime();
  if (diffMs <= 0) return 'Starting now';
  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];
  if (days) parts.push(`${days}d`);
  if (days || hours) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);
  return `Starts in ${parts.join(' ')}`;
}
