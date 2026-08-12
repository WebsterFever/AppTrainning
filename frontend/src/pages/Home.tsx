import { useEffect, useState, useMemo, useCallback } from 'react';
import { api, ClassItem } from '../lib/api';
import ClassCard from '../components/ClassCard';
import { ClassCardSkeleton } from '../components/Skeletons';
import Header from '../components/Header';
import Footer from '../components/Footer';
import TechnologyAside from '../components/TechnologyAside';
import ChatWidget from '../components/ChatWidget';
import WinnerOfMonth from '../components/WinnerOfMonth';
import { useLanguage, type TranslationKey } from '../lib/i18n';

// Constants
const SECTION_IDS = {
  UPCOMING: 'upcoming-classes',
  PAST: 'past-classes',
} as const;

const HERO_IMAGE = {
  URL: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=1800&q=85',
  ALT: 'Modern technology and software development',
} as const;

const COMPETITION_DETAILS = {
  PRIZE_AMOUNT: 100,
  CURRENCY: 'USD',
} as const;

// Helper functions
const calculateTotalRegistrations = (classes: ClassItem[]): number => {
  return classes.reduce((total, classItem) => total + classItem.registrationCount, 0);
};

// Sub-components
const HeroBadge: React.FC = () => {
  const { t } = useLanguage();
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-line bg-white/75 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-ink shadow-sm backdrop-blur-md dark:border-white/15 dark:bg-white/10 dark:text-white sm:text-xs">
      <span className="h-2 w-2 rounded-full bg-sage" />
      {t('liveTechTraining')}
    </span>
  );
};

const HeroFeatures: React.FC = () => {
  const { t } = useLanguage();
  const features: TranslationKey[] = ['heroFeatureLiveZoom', 'heroFeatureHandsOn', 'heroFeatureIndustry'];
  return (
    <div className="mt-7 flex flex-wrap gap-2 sm:gap-3">
      {features.map((key) => (
        <span
          key={key}
          className="rounded-full border border-line bg-white/75 px-4 py-2 text-xs text-ink shadow-sm backdrop-blur-md dark:border-white/15 dark:bg-white/10 dark:text-white sm:text-sm"
        >
          {t(key)}
        </span>
      ))}
    </div>
  );
};

const StatsDisplay: React.FC<{ stats: { upcoming: number; past: number; registrations: number } }> = ({ stats }) => {
  const { t } = useLanguage();
  const items: { label: string; value: number }[] = [
    { label: t('statUpcoming'), value: stats.upcoming },
    { label: t('statCompleted'), value: stats.past },
    { label: t('statRegistrations'), value: stats.registrations },
  ];
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      {items.map((stat) => (
        <div
          key={stat.label}
          className="min-w-0 rounded-xl border border-line bg-surface px-2 py-4 text-center shadow-sm sm:px-3"
        >
          <strong className="block text-xl text-ink sm:text-2xl">{stat.value}</strong>
          <span className="block truncate font-mono text-[8px] uppercase tracking-wide text-ink/50 sm:text-[10px]">
            {stat.label}
          </span>
        </div>
      ))}
    </div>
  );
};

const WinnerCard: React.FC<{ place: number; name: string; points: number; image: string; isFirst?: boolean }> = ({
  place,
  name,
  points,
  image,
  isFirst = false,
}) => {
  const { t } = useLanguage();
  const baseClasses = 'relative overflow-hidden rounded-2xl p-5 text-center shadow-sm';
  const placeClasses = isFirst
    ? 'border-2 border-amber/60 bg-amber/5 shadow-md'
    : 'border border-line bg-chalk/50';

  return (
    <div className={`${baseClasses} ${placeClasses}`}>
      <div
        className={`absolute right-3 top-3 rounded-full px-3 py-1 font-mono text-[10px] font-semibold ${
          isFirst ? 'bg-amber text-midnight' : 'border border-line bg-surface text-ink'
        }`}
      >
        {t('placeOrdinal', { place })}
      </div>

      <div className="text-4xl">{['🥇', '🥈', '🥉'][place - 1]}</div>

      <div
        className={`mx-auto mt-3 overflow-hidden rounded-full border-4 ${
          isFirst ? 'border-amber/30' : 'border-line'
        } bg-surface shadow-md ${isFirst ? 'h-24 w-24' : 'h-20 w-20'}`}
      >
        <img src={image} alt={`${name} - ${place} place winner`} className="h-full w-full object-cover" />
      </div>

      <h3 className={`mt-4 font-display font-semibold text-ink ${isFirst ? 'text-2xl' : 'text-xl'}`}>
        {name}
      </h3>

      <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-ink/45">
        {t('place', { place })}
      </p>

      <div
        className={`mt-4 rounded-xl px-4 py-3 ${isFirst ? 'bg-amber' : 'border border-line bg-surface'}`}
      >
        <strong className={`block text-xl ${isFirst ? 'text-midnight' : 'text-ink'}`}>
          {t('pts', { points })}
        </strong>
        <span className={`text-xs ${isFirst ? 'text-midnight/70' : 'text-ink/45'}`}>
          {t('monthlyScore')}
        </span>
      </div>
    </div>
  );
};

const CompetitionSection: React.FC = () => {
  const { t } = useLanguage();
  const winners = [
    { place: 1, name: 'Ana', points: 120, image: 'https://randomuser.me/api/portraits/women/44.jpg' },
    { place: 2, name: 'John', points: 95, image: 'https://randomuser.me/api/portraits/men/35.jpg' },
    { place: 3, name: 'Maria', points: 78, image: 'https://randomuser.me/api/portraits/women/68.jpg' },
  ];

  return (
    <div className="relative flex h-full flex-col">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber sm:text-xs">
          {t('monthlyCompetition', { amount: COMPETITION_DETAILS.PRIZE_AMOUNT })}
        </p>

        <h2 className="mt-3 max-w-3xl font-display text-3xl leading-[1.05] text-ink sm:text-4xl md:text-5xl">
          {t('winnerOfTheMonth')}
        </h2>

        <p className="mt-4 max-w-2xl text-sm leading-7 text-ink/60 sm:text-base">
          {t('competitionBody', { amount: COMPETITION_DETAILS.PRIZE_AMOUNT })}
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {winners.map((winner) => (
          <WinnerCard
            key={winner.place}
            place={winner.place}
            name={winner.name}
            points={winner.points}
            image={winner.image}
            isFirst={winner.place === 1}
          />
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-line bg-surface/80 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber/15 text-2xl">
            🏆
          </div>

          <div>
            <h3 className="text-sm font-semibold text-ink sm:text-base">{t('wantToBeNextWinner')}</h3>

            <p className="mt-1 text-xs leading-5 text-ink/55 sm:text-sm">{t('competitionEncourage')}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const ClassListSection: React.FC<{
  title: string;
  classes: ClassItem[];
  emptyMessage?: string;
  emptySubMessage?: string;
}> = ({ title, classes, emptyMessage, emptySubMessage }) => {
  const { t } = useLanguage();
  if (classes.length === 0 && emptyMessage) {
    return (
      <section className="py-4 text-center">
        <div className="rounded-2xl border border-line bg-surface px-6 py-12 shadow-sm">
          <p className="font-display text-2xl text-ink/70">{emptyMessage}</p>
          {emptySubMessage && (
            <p className="mt-2 text-sm text-ink/50 sm:text-base">{emptySubMessage}</p>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="animate-fade-in">
      <div className="mb-5 flex items-center justify-between">
        <p className="font-mono text-xs uppercase tracking-widest text-ink/40">{title}</p>
        <span className="font-mono text-xs text-ink/40">{t('classCount', { count: classes.length })}</span>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {classes.map((classItem) => (
          <ClassCard key={classItem.id} item={classItem} />
        ))}
      </div>
    </section>
  );
};

// Main Component
export default function Home() {
  const { language, t } = useLanguage();
  const [upcoming, setUpcoming] = useState<ClassItem[]>([]);
  const [past, setPast] = useState<ClassItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // A class only shows for visitors browsing in its tagged audience
  // language — classes left untagged by the admin (the common case for
  // anything created before this feature) show for everyone.
  const visibleUpcoming = useMemo(
    () => upcoming.filter((c) => !c.language || c.language === language),
    [upcoming, language],
  );
  const visiblePast = useMemo(
    () => past.filter((c) => !c.language || c.language === language),
    [past, language],
  );

  const totalRegistrations = useMemo(
    () => calculateTotalRegistrations([...visibleUpcoming, ...visiblePast]),
    [visibleUpcoming, visiblePast]
  );

  const stats = useMemo(
    () => ({
      upcoming: visibleUpcoming.length,
      past: visiblePast.length,
      registrations: totalRegistrations,
    }),
    [visibleUpcoming.length, visiblePast.length, totalRegistrations]
  );

  const fetchClasses = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [upcomingClasses, pastClasses] = await Promise.all([
        api.listClasses('upcoming'),
        api.listClasses('past'),
      ]);

      setUpcoming(upcomingClasses);
      setPast(pastClasses);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load classes'));
      console.error('Failed to load classes:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  const renderLoadingState = () => (
    <div>
      <p className="mb-4 font-mono text-xs uppercase tracking-widest text-ink/40">
        {t('loadingClasses')}
      </p>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <ClassCardSkeleton key={index} />
        ))}
      </div>
    </div>
  );

  const renderContent = () => (
    <>
      <ClassListSection
        title={t('upcoming')}
        classes={visibleUpcoming}
        emptyMessage={upcoming.length > 0 ? t('noClassesForLanguage') : t('noUpcomingClasses')}
        emptySubMessage={upcoming.length > 0 ? undefined : t('checkBackSoon')}
      />

      {visiblePast.length > 0 && (
        <div className="mt-12 border-t border-line pt-10" id={SECTION_IDS.PAST}>
          <ClassListSection title={t('pastClasses')} classes={visiblePast} />
        </div>
      )}
    </>
  );

  return (
    <div className="flex min-h-screen flex-col bg-chalk text-ink">
      <Header />

      <main className="flex-1">
        <section className="mx-auto w-full max-w-[1500px] px-4 pb-10 pt-6 sm:px-6 sm:pt-8 lg:px-8">
          <div className="relative min-h-[620px] overflow-hidden rounded-2xl border border-line bg-white shadow-lg dark:bg-slate-950 sm:min-h-[660px] sm:rounded-3xl lg:min-h-[700px]">
            <img
              src={HERO_IMAGE.URL}
              alt={HERO_IMAGE.ALT}
              className="absolute inset-0 h-full w-full object-cover opacity-20 dark:opacity-35"
            />

            <div className="absolute inset-0 bg-gradient-to-r from-white via-white/95 to-white/65 dark:from-slate-950 dark:via-slate-950/90 dark:to-indigo-950/60" />
            <div className="absolute inset-0 bg-gradient-to-t from-white/90 via-transparent to-transparent dark:from-slate-950/80" />

            <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-amber/15 blur-3xl dark:bg-indigo-500/20" />
            <div className="absolute -bottom-28 left-12 h-72 w-72 rounded-full bg-sage/10 blur-3xl dark:bg-cyan-400/10" />

            <div
              className="absolute inset-0 opacity-[0.04] dark:opacity-[0.06]"
              style={{
                backgroundImage:
                  'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)',
                backgroundSize: '32px 32px',
              }}
            />

            <div className="relative grid min-h-[620px] items-center gap-10 px-5 py-8 sm:min-h-[660px] sm:px-10 sm:py-10 lg:min-h-[700px] lg:grid-cols-[minmax(0,52%)_minmax(420px,48%)] lg:px-12 xl:px-16">
              <div className="max-w-4xl">
                <HeroBadge />

                <h1 className="mt-6 max-w-3xl font-display text-4xl font-bold leading-[1.05] text-ink dark:text-white sm:text-5xl md:text-6xl xl:text-6xl">
                  {t('heroLine1')}
                  <span className="block text-amber">{t('heroLine2')}</span>
                </h1>

                <p className="mt-5 max-w-2xl text-sm leading-7 text-ink/65 dark:text-white/75 sm:text-lg sm:leading-8">
                  {t('heroSubtitle')}
                </p>

                <HeroFeatures />

                <a
                  href={`#${SECTION_IDS.UPCOMING}`}
                  className="mt-8 inline-flex min-h-12 items-center justify-center rounded-lg bg-amber px-6 text-sm font-semibold text-midnight shadow-md transition hover:-translate-y-0.5 hover:bg-coral"
                >
                  {t('exploreUpcomingClasses')}
                  <span className="ml-2" aria-hidden="true">→</span>
                </a>
              </div>

              <div className="flex w-full justify-center lg:justify-end">
                <div className="w-full max-w-[560px] [&>aside]:w-full [&>aside]:max-w-none">
                  <TechnologyAside />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-[1500px] px-4 pb-10 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm sm:rounded-3xl">
            <div className="grid items-stretch lg:grid-cols-[minmax(0,1fr)_400px]">
              <div className="relative flex min-h-full flex-col overflow-hidden p-5 sm:p-8 lg:p-10 xl:p-12">
                <div className="pointer-events-none absolute -left-20 -top-24 h-64 w-64 rounded-full bg-amber/10 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-28 right-0 h-72 w-72 rounded-full bg-sage/10 blur-3xl" />

                <div
                  className="pointer-events-none absolute inset-0 opacity-[0.025]"
                  style={{
                    backgroundImage:
                      'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)',
                    backgroundSize: '32px 32px',
                  }}
                />

                <CompetitionSection />
              </div>

              <div className="border-t border-line bg-chalk/45 p-4 sm:p-6 lg:border-l lg:border-t-0">
                <div className="flex h-full flex-col gap-4">
                  {!isLoading && <StatsDisplay stats={stats} />}
                  <div className="min-h-0 flex-1 [&>div]:h-full [&>section]:h-full">
                    <WinnerOfMonth />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id={SECTION_IDS.UPCOMING}
          className="mx-auto w-full max-w-[1500px] px-4 pb-14 sm:px-6 lg:px-8 scroll-mt-24"
        >
          <div className="min-w-0">
            {isLoading ? renderLoadingState() : renderContent()}
          </div>
        </section>
      </main>

      <Footer />
      <ChatWidget />
    </div>
  );
}
