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
      {/* Main header row */}
      <div
        className="
          mx-auto
          flex
          w-full
          max-w-6xl
          items-center
          justify-between
          gap-2
          px-3
          py-2
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
          {/* Light Mode */}
          <img
            src="/logoLightMode.png"
            alt="Webster Technology School"
            className="
              block
              h-10
              w-auto
              max-w-[135px]
              object-contain
              sm:h-12
              sm:max-w-[170px]
              md:h-14
              md:max-w-[210px]
              lg:h-16
              lg:max-w-none
              dark:hidden
            "
          />

          {/* Dark Mode */}
          <img
            src="/logoDarkMode.png"
            alt="Webster Technology School"
            className="
              hidden
              h-10
              w-auto
              max-w-[135px]
              object-contain
              sm:h-12
              sm:max-w-[170px]
              md:h-14
              md:max-w-[210px]
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

        {/* Right side */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {/* Always visible */}
          <NotificationBell />

          {/* Tablet and desktop */}
          <div className="hidden sm:block">
            <LanguageSwitcher />
          </div>

          <div className="hidden md:block">
            <ThemeToggle />
          </div>

          {/* Teacher button desktop */}
          <Link
            to="/admin"
            className="hidden lg:inline-flex btn-outline whitespace-nowrap text-sm"
          >
            {t('navTeacher')}
          </Link>

          {/* Burger */}
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={
              menuOpen ? t('navCloseMenu') : t('navOpenMenu')
            }
            aria-expanded={menuOpen}
            className="
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
              transition
              hover:bg-chalk
              lg:hidden
            "
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Mobile / tablet dropdown */}
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
            {/* Navigation */}
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
                  transition
                  hover:bg-surface
                "
              >
                {link.label}
              </a>
            ))}

            {/* Book */}
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
                transition
                hover:bg-surface
              "
            >
              {t('navTeacher')}
            </Link>

            {/* Mobile settings */}
            <div
              className="
                mt-1
                flex
                flex-col
                gap-3
                border-t
                border-line
                pt-4
              "
            >
              {/* Hidden from header below sm */}
              <div className="flex items-center justify-between sm:hidden">
                <span className="text-sm font-medium text-ink">
                  Language
                </span>

                <LanguageSwitcher />
              </div>

              {/* Hidden from header below md */}
              <div className="flex items-center justify-between md:hidden">
                <span className="text-sm font-medium text-ink">
                  Theme
                </span>

                <ThemeToggle />
              </div>
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}