import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ClassItem } from '../lib/api';
import { formatCountdown } from '../lib/countdown';

function formatDateParts(iso?: string) {
  if (!iso) return null;
  const date = new Date(iso);

  return {
    day: date.toLocaleDateString('en-US', {
      day: '2-digit',
    }),
    month: date
      .toLocaleDateString('en-US', {
        month: 'short',
      })
      .toUpperCase(),
    time: date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    }),
  };
}

export default function ClassCard({ item }: { item: ClassItem }) {
  const dateParts = formatDateParts(item.classDate);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  return (
    <Link
      to={`/classes/${item.id}`}
      className="group block overflow-hidden rounded-md border border-line bg-surface shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl"
    >
      <div className="relative overflow-hidden">
        <img
          src={item.imageUrl}
          alt={item.title}
          className="h-48 w-full object-cover transition-transform duration-500 group-hover:scale-105 sm:h-44 md:h-40"
          loading="lazy"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-ink/30 via-transparent to-transparent" />

        {dateParts && (
          <div className="absolute left-3 top-3 -rotate-2 rounded-sm bg-ink text-center font-mono text-chalk shadow-md transition-transform duration-200 group-hover:rotate-0">
            <div className="px-3 pt-2 text-2xl leading-none tabular-nums">
              {dateParts.day}
            </div>

            <div className="px-3 pb-2 text-[10px] tracking-widest">
              {dateParts.month}
            </div>
          </div>
        )}

        {item.isPast && (
          <div className="absolute right-3 top-3 rounded-sm bg-sage px-2 py-1 font-mono text-[10px] tracking-wide text-chalk">
            PAST
          </div>
        )}

        {item.isPaid && (
          <div className="absolute right-3 bottom-3 rounded-sm bg-amber px-2 py-1 font-mono text-[10px] tracking-wide text-midnight">
            PAID
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="line-clamp-2 font-display text-xl leading-snug text-ink transition-colors group-hover:text-amber sm:text-lg md:text-xl">
          {item.title}
        </h3>

        <p className="mt-1 font-mono text-sm text-ink/60">
          {dateParts ? dateParts.time : 'Self-paced'}
        </p>

        {!item.isPast && item.classDate && (
          <p className="mt-0.5 font-mono text-xs text-amber">
            {formatCountdown(item.classDate, now)}
          </p>
        )}

        <p className="mt-3 line-clamp-2 text-sm leading-6 text-ink/70">
          {item.description}
        </p>

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-line/70 pt-3">
          <span className="flex items-center gap-1.5 font-mono text-xs text-ink/60">
            <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-sage" />
            {item.registrationCount} registered
          </span>

          {!item.isPast && (
            <span className="flex-shrink-0 text-xs font-semibold text-amber transition-colors group-hover:text-coral">
              Register →
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}