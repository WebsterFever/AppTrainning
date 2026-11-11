import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ClassItem } from '../lib/api';
import { formatCountdown } from '../lib/countdown';
import { useLanguage, localeFor } from '../lib/i18n';

// Responsive course catalog card: compact Udemy-inspired layout on mobile and web.
// Keep navigation, actual course data, multilingual copy and registration flow intact.
export default function ClassCard({ item }: { item: ClassItem; reverse?: boolean; compactMobile?: boolean }) {
  const { language, t } = useLanguage();
  const locale = localeFor(language);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (item.isPast || !item.classDate) return;
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, [item.isPast, item.classDate]);

  const date = item.classDate ? new Date(item.classDate) : null;
  const dateLabel = date ? date.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' }) : t('selfPaced');
  const timeLabel = date ? date.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' }) : '';
  const viewLabel = language === 'ht' ? 'Gade kou a' : language === 'fr' ? 'Voir le cours' : 'View course';

  return (
    <Link
      to={`/classes/${item.id}`}
      className="group flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-amber/70 hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber"
    >
      <div className="relative aspect-video w-full overflow-hidden bg-chalk">
        <img src={item.imageUrl} alt={item.title} loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
        <span className={`absolute left-3 top-3 rounded-md px-2.5 py-1 text-[11px] font-bold shadow-sm ${item.isPast ? 'bg-sage text-chalk' : 'bg-amber text-midnight'}`}>
          {item.isPast ? t('past') : dateLabel}
        </span>
        {item.isPaid && (
          <span className="absolute right-3 top-3 rounded-md bg-ink px-2.5 py-1 text-[11px] font-semibold text-chalk">
            {t('paid')}
          </span>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col p-4 sm:p-5">
        <h3 className="line-clamp-2 min-h-[3.25rem] font-display text-lg font-bold leading-snug text-ink transition-colors group-hover:text-amber sm:text-xl">
          {item.title}
        </h3>
        <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink/65">
          <span>{dateLabel}</span>
          {timeLabel && <><span aria-hidden="true">·</span><span>{timeLabel}</span></>}
        </p>
        {!item.isPast && item.classDate && (
          <p className="mt-2 text-xs font-semibold text-amber">
            {formatCountdown(item.classDate, now, t, language)}
          </p>
        )}
        <p className="mt-3 line-clamp-3 whitespace-pre-line break-words text-sm leading-6 text-ink/70">
          {item.description}
        </p>
        <div className="mt-auto pt-4">
          <div className="mb-3 flex items-center gap-2 border-t border-line pt-3 text-xs text-ink/60">
            <span className="h-2 w-2 rounded-full bg-sage" aria-hidden="true" />
            {t('registered', { count: item.registrationCount })}
          </div>
          <span className={`inline-flex min-h-11 w-full items-center justify-center rounded-lg px-4 text-sm font-bold transition-colors ${item.isPast ? 'border border-line bg-chalk text-ink group-hover:border-amber' : 'bg-amber text-midnight group-hover:bg-coral'}`}>
            {item.isPast ? viewLabel : t('registerArrow')}
          </span>
        </div>
      </div>
    </Link>
  );
}
