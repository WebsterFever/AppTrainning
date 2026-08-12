import { useLanguage, type Language } from '../lib/i18n';

const OPTIONS: { code: Language; label: string; ariaLabel: string }[] = [
  { code: 'en', label: 'EN', ariaLabel: 'English' },
  { code: 'fr', label: 'FR', ariaLabel: 'Français' },
  { code: 'ht', label: 'HT', ariaLabel: 'Kreyòl' },
];

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center rounded-sm border border-line overflow-hidden text-xs font-mono">
      {OPTIONS.map((opt, i) => (
        <button
          key={opt.code}
          type="button"
          onClick={() => setLanguage(opt.code)}
          aria-label={opt.ariaLabel}
          aria-pressed={language === opt.code}
          className={`px-2 py-1.5 transition-colors ${i > 0 ? 'border-l border-line' : ''} ${
            language === opt.code ? 'bg-ink text-chalk' : 'text-ink/60 hover:text-ink'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
