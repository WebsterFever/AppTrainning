import { useEffect, useState } from 'react';
import { api, type ClassItem } from '../lib/api';
import ClassCard from '../components/ClassCard';
import { ClassCardSkeleton } from '../components/Skeletons';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useLanguage } from '../lib/i18n';

export default function PastClasses() {
  const { language, t } = useLanguage();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    const refresh = async () => {
      try {
        const items = await api.listClasses('past', language);
        if (active) {
          setClasses(items.filter((item) => item.isPast && item.language === language));
          setError(false);
        }
      } catch {
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    };
    void refresh();
    const interval = window.setInterval(refresh, 5000);
    const onFocus = () => { void refresh(); };
    window.addEventListener('focus', onFocus);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [language]);

  return (
    <div className="flex min-h-screen flex-col bg-chalk text-ink">
      <Header />
      <main className="mx-auto w-full max-w-[1500px] flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="mb-8 font-display text-3xl sm:text-4xl">{t('pastClasses')}</h1>
        {loading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{[0, 1].map((i) => <ClassCardSkeleton key={i} />)}</div>
        ) : error ? (
          <p className="text-ink/70">{t('loadingClasses')}</p>
        ) : classes.length === 0 ? (
          <p className="rounded-xl border border-line bg-surface p-8 text-ink/70">{t('noClassesForLanguage')}</p>
        ) : (
          <div className="grid gap-8">
            {classes.map((item, index) => <ClassCard key={item.id} item={item} reverse={index % 2 === 1} compactMobile />)}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
