import { Link } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-chalk/90 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2 sm:py-3 flex items-center justify-between gap-3">
        <Link to="/" className="flex items-center">
          <img
            src="/logoLightMode.png"
            alt="Webster Technology School"
            className="h-14 sm:h-16 w-auto dark:hidden"
          />
          <img
            src="/logoDarkMode.png"
            alt="Webster Technology School"
            className="h-14 sm:h-16 w-auto hidden dark:block"
          />
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link to="/admin" className="btn-outline text-sm">
            Admin
          </Link>
        </div>
      </div>
    </header>
  );
}
