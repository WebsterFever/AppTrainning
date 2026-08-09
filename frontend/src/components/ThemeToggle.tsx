import { useEffect, useState } from 'react';
import { useLanguage } from '../lib/i18n';

const THEME_KEY = 'classboard_theme';

function getInitialTheme(): 'light' | 'dark' {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>(getInitialTheme);
  const { t } = useLanguage();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  return (
    <button
      onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
      aria-label={theme === 'dark' ? t('switchToLight') : t('switchToDark')}
      className="btn-outline text-sm px-2.5"
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
}
