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
            alt="Webster Technology School"
            className="h-34 sm:h-40 lg:h-54 w-auto dark:hidden"
          />

          {/* Dark Mode Logo */}
          <img
            src="/logoDarkMode.png"
            alt="Webster Technology School"
            className="hidden h-34 sm:h-40 lg:h-54 w-auto dark:block"
          />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex flex-wrap items-center gap-2">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href} className="btn-outline text-sm">
              {link.label}
            </a>
          ))}
          <Link to="/book" className="btn-primary text-sm">
            {t('navBookClass')}
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <NotificationBell />
          <LanguageSwitcher />
          <ThemeToggle />

          <Link to="/admin" className="hidden md:inline-flex btn-outline text-sm">
            {t('navTeacher')}
          </Link>

          {/* Mobile burger toggle */}
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? t('navCloseMenu') : t('navOpenMenu')}
            aria-expanded={menuOpen}
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-sm border border-line text-ink"
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Mobile menu panel */}
      {menuOpen && (
        <nav className="md:hidden border-t border-line bg-chalk px-4 py-4 flex flex-col gap-2 animate-fade-in">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="btn-outline text-sm w-full justify-start"
            >
              {link.label}
            </a>
          ))}
          <Link
            to="/book"
            onClick={() => setMenuOpen(false)}
            className="btn-primary text-sm w-full text-center"
          >
            {t('navBookClass')}
          </Link>
          <Link
            to="/admin"
            onClick={() => setMenuOpen(false)}
            className="btn-outline text-sm w-full justify-start"
          >
            {t('navTeacher')}
          </Link>
        </nav>
      )}
    </header>
  );
}