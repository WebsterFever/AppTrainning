import { Link } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-chalk/90 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center">
          {/* Light Mode Logo */}
          <img
            src="/logoLightMode.png"
            alt="Webster Technology School"
            className="h-20 sm:h-28 lg:h-32 w-auto dark:hidden"
          />

          {/* Dark Mode Logo */}
          <img
            src="/logoDarkMode.png"
            alt="Webster Technology School"
            className="hidden h-20 sm:h-28 lg:h-32 w-auto dark:block"
          />
        </Link>

        <div className="flex items-center gap-3">
          <ThemeToggle />

          <Link to="/admin" className="btn-outline text-sm">
            Admin
          </Link>
        </div>
      </div>
    </header>
  );
}