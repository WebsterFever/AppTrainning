import { useLanguage } from '../lib/i18n';

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center rounded-sm border border-line overflow-hidden text-xs font-mono">
      <button
        type="button"
        onClick={() => setLanguage('en')}
        aria-label="English"
        aria-pressed={language === 'en'}
        className={`px-2 py-1.5 transition-colors ${
          language === 'en' ? 'bg-ink text-chalk' : 'text-ink/60 hover:text-ink'
        }`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLanguage('fr')}
        aria-label="Français"
        aria-pressed={language === 'fr'}
        className={`px-2 py-1.5 border-l border-line transition-colors ${
          language === 'fr' ? 'bg-ink text-chalk' : 'text-ink/60 hover:text-ink'
        }`}
      >
        FR
      </button>
    </div>
  );
}
