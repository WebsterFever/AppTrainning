import { useLanguage, type Language } from '../lib/i18n';

const OPTIONS: { code: Language; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'ht', label: 'Kreyòl' },
];

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="relative">
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value as Language)}
        aria-label="Select language"
        className="
          h-10
          min-w-[110px]
          appearance-none
          rounded-sm
          border border-line
          bg-chalk
          pl-3 pr-8
          text-sm
          font-medium
          text-ink
          cursor-pointer
          outline-none
          transition-colors
          hover:border-ink/40
          focus:border-ink/50
          dark:bg-surface
        "
      >
        {OPTIONS.map((opt) => (
          <option key={opt.code} value={opt.code}>
            {opt.label}
          </option>
        ))}
      </select>

      <span
        className="
          pointer-events-none
          absolute
          right-3
          top-1/2
          -translate-y-1/2
          text-[10px]
          text-ink/60
        "
      >
        ▼
      </span>
    </div>
  );
}