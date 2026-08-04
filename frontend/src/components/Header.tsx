import { useState } from 'react';
import { Link } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';

const navLinks = [
  { href: '/#upcoming-classes', label: 'Upcoming Classes' },
  { href: '/#past-classes', label: 'Past Classes' },
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-chalk/90 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center" onClick={() => setMenuOpen(false)}>
          {/* Light Mode Logo */}
          <img
            src="/logoLightMode.png"
            alt="Webster Technology School"
            className="h-14 sm:h-20 lg:h-32 w-auto dark:hidden"
          />

          {/* Dark Mode Logo */}
          <img
            src="/logoDarkMode.png"
            alt="Webster Technology School"
            className="hidden h-14 sm:h-20 lg:h-32 w-auto dark:block"
          />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex flex-wrap items-center gap-2">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href} className="btn-outline text-sm">
              {link.label}
            </a>
          ))}
          <a href="/#upcoming-classes" className="btn-primary text-sm">
            Book a Class
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <ThemeToggle />

          <Link to="/admin" className="hidden md:inline-flex btn-outline text-sm">
            Admin
          </Link>

          {/* Mobile burger toggle */}
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
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
          <a
            href="/#upcoming-classes"
            onClick={() => setMenuOpen(false)}
            className="btn-primary text-sm w-full"
          >
            Book a Class
          </a>
          <Link
            to="/admin"
            onClick={() => setMenuOpen(false)}
            className="btn-outline text-sm w-full justify-start"
          >
            Admin
          </Link>
        </nav>
      )}
    </header>
  );
}
