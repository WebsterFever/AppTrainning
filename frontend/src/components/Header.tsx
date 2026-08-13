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
    <header className="sticky top-0 z-40 w-full border-b border-line bg-chalk/95 backdrop-blur">
      {/* Main header */}
      <div
        className="
          mx-auto
          flex
          w-full
          max-w-6xl
          items-center
          justify-between
          gap-1
          px-2
          py-2
          sm:gap-2
          sm:px-4
          sm:py-3
          md:px-6
          lg:py-4
        "
      >
        {/* Logo */}
        <Link
          to="/"
          onClick={() => setMenuOpen(false)}
          className="min-w-0 shrink"
        >
          {/* Light mode logo */}
          <img
            src="/logoLightMode.png"
            alt="Webster Technology School"
            className="
              block
              h-9
              w-auto
              max-w-[115px]
              object-contain
              sm:h-11
              sm:max-w-[155px]
              md:h-14
              md:max-w-[200px]
              lg:h-16
              lg:max-w-none
              dark:hidden
            "
          />

          {/* Dark mode logo */}
          <img
            src="/logoDarkMode.png"
            alt="Webster Technology School"
            className="
              hidden
              h-9
              w-auto
              max-w-[115px]
              object-contain
              sm:h-11
              sm:max-w-[155px]
              md:h-14
              md:max-w-[200px]
              lg:h-16
              lg:max-w-none
              dark:block
            "
          />
        </Link>

        {/* Desktop navigation */}
        <nav className="hidden lg:flex items-center gap-2">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="btn-outline whitespace-nowrap text-sm"
            >
              {link.label}
            </a>
          ))}

          <Link
            to="/book"
            className="btn-primary whitespace-nowrap text-sm"
          >
            {t('navBookClass')}
          </Link>
        </nav>

        {/* Right controls */}
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          {/* Notifications */}
          <NotificationBell />

          {/* Language - always outside burger */}
          <LanguageSwitcher />

          {/* Theme - always outside burger */}
          <ThemeToggle />

          {/* Teacher button - desktop */}
          <Link
            to="/admin"
            className="hidden lg:inline-flex btn-outline whitespace-nowrap text-sm"
          >
            {t('navTeacher')}
          </Link>

          {/* Burger - mobile/tablet */}
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={
              menuOpen ? t('navCloseMenu') : t('navOpenMenu')
            }
            aria-expanded={menuOpen}
            className="
              lg:hidden
              flex
              h-10
              w-10
              shrink-0
              items-center
              justify-center
              rounded-md
              border
              border-line
              bg-surface
              text-xl
              text-ink
              transition-colors
              hover:bg-chalk
            "
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Mobile + tablet menu */}
      {menuOpen && (
        <nav
          className="
            lg:hidden
            border-t
            border-line
            bg-chalk
            px-3
            py-4
            sm:px-4
            md:px-6
          "
        >
          <div className="mx-auto flex max-w-6xl flex-col gap-3">
            {/* Upcoming / Past */}
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="
                  flex
                  min-h-11
                  w-full
                  items-center
                  rounded-md
                  border
                  border-line
                  px-4
                  text-sm
                  font-medium
                  text-ink
                  transition-colors
                  hover:bg-surface
                "
              >
                {link.label}
              </a>
            ))}

            {/* Book class */}
            <Link
              to="/book"
              onClick={() => setMenuOpen(false)}
              className="
                btn-primary
                flex
                min-h-11
                w-full
                items-center
                justify-center
                text-sm
              "
            >
              {t('navBookClass')}
            </Link>

            {/* Teacher */}
            <Link
              to="/admin"
              onClick={() => setMenuOpen(false)}
              className="
                flex
                min-h-11
                w-full
                items-center
                rounded-md
                border
                border-line
                px-4
                text-sm
                font-medium
                text-ink
                transition-colors
                hover:bg-surface
              "
            >
              {t('navTeacher')}
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}