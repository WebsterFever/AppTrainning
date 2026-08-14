import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ClassItem } from '../lib/api';
import { formatCountdown } from '../lib/countdown';
import { useLanguage, localeFor } from '../lib/i18n';

function formatDateParts(iso: string | undefined, locale: string) {
  if (!iso) return null;

  const date = new Date(iso);

  return {
    day: date.toLocaleDateString(locale, {
      day: '2-digit',
    }),
    month: date
      .toLocaleDateString(locale, {
        month: 'short',
      })
      .toUpperCase(),
    time: date.toLocaleTimeString(locale, {
      hour: 'numeric',
      minute: '2-digit',
    }),
  };
}

export default function ClassCard({ item }: { item: ClassItem }) {
  const { language, t } = useLanguage();
  const locale = localeFor(language);
  const dateParts = formatDateParts(item.classDate, locale);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);

    return () => clearInterval(timer);
  }, []);

  return (
    <Link
      to={`/classes/${item.id}`}
      className="
        group
        block
        overflow-hidden
        rounded-2xl
        border border-line
        bg-surface
        shadow-sm
        transition-all
        duration-300
        hover:-translate-y-1
        hover:shadow-xl
        md:grid
        md:grid-cols-[48%_52%]
        lg:min-h-[390px]
      "
    >
      {/* IMAGE */}
      <div className="relative min-h-[240px] overflow-hidden sm:min-h-[300px] md:min-h-full">
        <img
          src={item.imageUrl}
          alt={item.title}
          className="
            absolute
            inset-0
            h-full
            w-full
            object-cover
            transition-transform
            duration-500
            group-hover:scale-105
          "
          loading="lazy"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-ink/30 via-transparent to-transparent" />

        {/* DATE */}
        {dateParts && (
          <div className="absolute left-4 top-4 -rotate-2 rounded-md bg-ink text-center font-mono text-chalk shadow-md transition-transform duration-200 group-hover:rotate-0">
            <div className="px-4 pt-2 text-2xl leading-none tabular-nums">
              {dateParts.day}
            </div>

            <div className="px-4 pb-2 text-[10px] tracking-widest">
              {dateParts.month}
            </div>
          </div>
        )}

        {/* PAST */}
        {item.isPast && (
          <div className="absolute right-4 top-4 rounded-md bg-sage px-3 py-2 font-mono text-[10px] tracking-wide text-chalk">
            {t('past')}
          </div>
        )}

        {/* PAID */}
        {item.isPaid && (
          <div className="absolute bottom-4 right-4 rounded-md bg-amber px-3 py-2 font-mono text-[10px] font-semibold tracking-wide text-midnight">
            {t('paid')}
          </div>
        )}
      </div>

      {/* CONTENT */}
      <div className="flex min-h-[330px] flex-col p-5 sm:p-7 md:min-h-full lg:p-9 xl:p-10">
        <div>
          <h3 className="font-display text-2xl font-semibold leading-tight text-ink transition-colors group-hover:text-amber sm:text-3xl lg:text-4xl">
            {item.title}
          </h3>

          <div className="my-5 h-px bg-line/80" />

          {/* TIME / SELF PACED */}
          <p className="font-mono text-sm text-ink/60">
            {dateParts ? dateParts.time : t('selfPaced')}
          </p>

          {/* COUNTDOWN */}
          {!item.isPast && item.classDate && (
            <p className="mt-2 font-mono text-xs font-medium text-amber">
              {formatCountdown(item.classDate, now, t)}
            </p>
          )}

          {/* DESCRIPTION */}
          <p className="mt-5 line-clamp-3 max-w-2xl text-sm leading-7 text-ink/65 sm:text-base lg:text-lg">
            {item.description}
          </p>
        </div>

        {/* BOTTOM */}
        <div className="mt-auto pt-7">
          <div className="border-t border-line/70 pt-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              {/* REGISTRATION COUNT */}
              <span className="flex items-center gap-2 font-mono text-xs text-ink/60 sm:text-sm">
                <span className="h-2 w-2 flex-shrink-0 rounded-full bg-sage" />

                {t('registered', {
                  count: item.registrationCount,
                })}
              </span>

              {/* ACTION */}
              {!item.isPast && (
                <span
                  className="
                    inline-flex
                    min-h-11
                    items-center
                    justify-center
                    rounded-lg
                    bg-amber
                    px-5
                    text-sm
                    font-semibold
                    text-midnight
                    transition-all
                    duration-200
                    group-hover:bg-coral
                  "
                >
                  {t('registerArrow')}
                </span>
              )}

              {item.isPast && (
                <span className="inline-flex min-h-11 items-center justify-center rounded-lg border border-line px-5 text-sm font-semibold text-ink">
                  {t('past')}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}