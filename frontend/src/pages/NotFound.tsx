import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useLanguage } from '../lib/i18n';

export default function NotFound() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-chalk flex flex-col">
      <Header />
      <div className="flex-1 flex items-center justify-center text-center px-6">
        <div>
          <p className="font-mono text-xs tracking-widest text-amber uppercase">404</p>
          <p className="font-display text-2xl text-ink mt-2">{t('notFoundTitle')}</p>
          <Link to="/" className="text-amber font-semibold mt-3 inline-block">
            {t('backToAllClasses')}
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  );
}
