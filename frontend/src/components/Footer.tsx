import { useLanguage } from '../lib/i18n';

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="border-t border-line mt-16">
      <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-col items-center sm:items-start gap-2">
          <img
            src="/logoLightMode.png"
            alt="Webster Technology School"
            className="h-20 w-auto dark:hidden"
          />
          <img
            src="/logoDarkMode.png"
            alt="Webster Technology School"
            className="h-20 w-auto hidden dark:block"
          />
          <p className="text-xs text-ink/50">{t('footerTagline')}</p>
        </div>
        <p className="text-xs font-mono text-ink/40">
          {t('footerRights', { year: new Date().getFullYear() })}
        </p>
      </div>
    </footer>
  );
}
