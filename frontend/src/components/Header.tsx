import { useState } from 'react';
import { Link } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
import LanguageSwitcher from './LanguageSwitcher';
import NotificationBell from './NotificationBell';
import { useLanguage } from '../lib/i18n';

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { t } = useLanguage();

  const navLinks = [
    { href: '/#upcoming-classes', label: t('navUpcoming') },
    { href: '/#past-classes', label: t('navPast') },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-chalk/90 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center shrink-0" onClick={() => setMenuOpen(false)}>
          {/* Light Mode Logo */}
          <img
            src="/logoLightMode.png"
            alt="WEBSTER TECHNOLOGY SCHOOL"
            className="h-12 sm:h-14 lg:h-16 w-auto dark:hidden"
          />

          {/* Dark Mode Logo */}
          <img
            src="/logoDarkMode.png"
            alt="WEBSTER TECHNOLOGY SCHOOL"
            className="hidden h-12 sm:h-14 lg:h-16 w-auto dark:block"
          />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-2">
          <a href={navLinks[0].href} className="px-4 py-2 text-sm font-medium text-ink hover:text-primary transition-colors">
            {navLinks[0].label}
          </a>
          <a href={navLinks[1].href} className="px-4 py-2 text-sm font-medium text-ink hover:text-primary transition-colors">
            {navLinks[1].label}
          </a>
          <Link to="/book" className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 transition-colors">
            {t('navBookClass')}
          </Link>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <NotificationBell />
          <LanguageSwitcher />
          <ThemeToggle />

          <Link to="/admin" className="hidden md:inline-flex px-4 py-2 text-sm font-medium border border-line rounded-md hover:bg-surface transition-colors">
            {t('navTeacher')}
          </Link>

          {/* Mobile burger toggle */}
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? t('navCloseMenu') : t('navOpenMenu')}
            aria-expanded={menuOpen}
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-md border border-line text-ink hover:bg-surface transition-colors"
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Mobile menu panel */}
      {menuOpen && (
        <nav className="md:hidden border-t border-line bg-chalk px-4 py-4 flex flex-col gap-2 animate-fade-in">
          <a
            href={navLinks[0].href}
            onClick={() => setMenuOpen(false)}
            className="px-4 py-3 text-sm font-medium text-ink hover:bg-surface rounded-md transition-colors"
          >
            {navLinks[0].label}
          </a>
          <a
            href={navLinks[1].href}
            onClick={() => setMenuOpen(false)}
            className="px-4 py-3 text-sm font-medium text-ink hover:bg-surface rounded-md transition-colors"
          >
            {navLinks[1].label}
          </a>
          <Link
            to="/book"
            onClick={() => setMenuOpen(false)}
            className="px-4 py-3 text-sm font-medium text-white bg-primary rounded-md text-center hover:bg-primary/90 transition-colors"
          >
            {t('navBookClass')}
          </Link>
          <Link
            to="/admin"
            onClick={() => setMenuOpen(false)}
            className="px-4 py-3 text-sm font-medium border border-line rounded-md text-center hover:bg-surface transition-colors"
          >
            {t('navTeacher')}
          </Link>
        </nav>
      )}
    </header>
  );
}