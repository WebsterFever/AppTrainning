import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { seenClasses, ClassNotification } from '../lib/seenClasses';
import { useLanguage, localeFor } from '../lib/i18n';

export default function NotificationBell() {
  const { language, t } = useLanguage();
  const locale = localeFor(language);

  const [notifications, setNotifications] = useState<ClassNotification[]>([]);
  const [open, setOpen] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);

  const refresh = () => {
    api.listClasses('upcoming').then((list) => {
      // Baseline against the FULL list regardless of language, so a class
      // that already existed before a visitor's first-ever visit never
      // retroactively becomes "new" just because they later switch to its
      // language.
      seenClasses.ensureBaseline(list);
      // But only notify about classes tagged for the language currently
      // selected (or untagged, which show to everyone) — a Creole class
      // must not notify an English or French visitor, and vice versa.
      const visible = list.filter((c) => !c.language || c.language === language);
      setNotifications(seenClasses.getNotifications(visible));
    });
  };

  useEffect(() => {
    refresh();

    const poll = setInterval(refresh, 30000);
    const unsubscribe = seenClasses.onChange(refresh);

    return () => {
      clearInterval(poll);
      unsubscribe();
    };
  }, [language]);

  useEffect(() => {
    if (!open) return;

    const onClickOutside = (e: MouseEvent) => {
      if (
        rootRef.current &&
        !rootRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', onClickOutside);

    return () => {
      document.removeEventListener('mousedown', onClickOutside);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t('notificationsAria', {
          count: notifications.length,
        })}
        className="
          relative
          w-9
          h-9
          flex
          items-center
          justify-center
          rounded-sm
          border
          border-line
          text-ink
          hover:bg-surface
          transition-colors
        "
      >
        🔔

        {notifications.length > 0 && (
          <span
            className="
              absolute
              -top-1
              -right-1
              min-w-[18px]
              h-[18px]
              px-1
              flex
              items-center
              justify-center
              rounded-full
              bg-coral
              text-white
              text-[10px]
              font-semibold
              leading-none
            "
          >
            {notifications.length}
          </span>
        )}
      </button>

      {open && (
        <div
          className="
            fixed
            left-3
            right-3
            top-20
            z-[100]
            max-h-[70vh]
            overflow-y-auto
            rounded-sm
            border
            border-line
            bg-chalk
            shadow-2xl
            animate-fade-in

            sm:left-4
            sm:right-4

            md:absolute
            md:left-auto
            md:right-0
            md:top-full
            md:mt-2
            md:w-80
            md:max-h-96

            dark:bg-surface
          "
        >
          <p
            className="
              px-3
              py-2
              text-xs
              font-mono
              uppercase
              tracking-widest
              text-ink/40
              border-b
              border-line
            "
          >
            {t('notifications')}
          </p>

          {notifications.length === 0 ? (
            <p className="px-3 py-4 text-sm text-ink/40 text-center">
              {t('noNewNotifications')}
            </p>
          ) : (
            <div className="divide-y divide-line">
              {notifications.map(({ item, isNewClass }) => (
                <Link
                  key={item.id}
                  to={`/classes/${item.id}`}
                  onClick={() => setOpen(false)}
                  className="
                    block
                    px-3
                    py-3
                    hover:bg-surface
                    transition-colors
                  "
                >
                  <span className="badge bg-coral text-white text-[9px]">
                    {isNewClass
                      ? t('newClassBadge')
                      : t('newVideoBadge')}
                  </span>

                  <p className="text-sm font-medium text-ink mt-1 line-clamp-2">
                    {item.title}
                  </p>

                  <p className="text-xs text-ink/50 font-mono mt-0.5">
                    {item.classDate
                      ? new Date(item.classDate).toLocaleString(locale, {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })
                      : t('selfPaced')}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}