import { useEffect, useState } from 'react';
import { api, ClassItem } from '../lib/api';
import ClassCard from '../components/ClassCard';
import { ClassCardSkeleton } from '../components/Skeletons';
import Header from '../components/Header';
import Footer from '../components/Footer';
import TechnologyAside from '../components/TechnologyAside';
import ChatWidget from '../components/ChatWidget';
import WinnerOfMonth from '../components/WinnerOfMonth';

export default function Home() {
  const [upcoming, setUpcoming] = useState<ClassItem[]>([]);
  const [past, setPast] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.listClasses('upcoming'),
      api.listClasses('past'),
    ])
      .then(([upcomingClasses, pastClasses]) => {
        setUpcoming(upcomingClasses);
        setPast(pastClasses);
      })
      .catch((error) => {
        console.error('Failed to load classes:', error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const totalRegistered = [...upcoming, ...past].reduce(
    (total, classItem) => total + classItem.registrationCount,
    0,
  );

  return (
    <div className="flex min-h-screen flex-col bg-chalk text-ink">
      <Header />

      <main className="flex-1">
        {/* Main hero */}
        <section className="mx-auto w-full max-w-[1500px] px-4 pb-10 pt-6 sm:px-6 sm:pt-8 lg:px-8">
          <div className="relative min-h-[620px] overflow-hidden rounded-2xl border border-line bg-white shadow-lg dark:bg-slate-950 sm:min-h-[660px] sm:rounded-3xl lg:min-h-[700px]">
            <img
              src="https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=1800&q=85"
              alt="Modern technology and software development"
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
                <span className="inline-flex items-center gap-2 rounded-full border border-line bg-white/75 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-ink shadow-sm backdrop-blur-md dark:border-white/15 dark:bg-white/10 dark:text-white sm:text-xs">
                  <span className="h-2 w-2 rounded-full bg-sage" />
                  Live technology training
                </span>

                <h1 className="mt-6 max-w-3xl font-display text-4xl font-bold leading-[1.05] text-ink dark:text-white sm:text-5xl md:text-6xl xl:text-6xl">
                  Build the technology
                  <span className="block text-amber">skills of tomorrow.</span>
                </h1>

                <p className="mt-5 max-w-2xl text-sm leading-7 text-ink/65 dark:text-white/75 sm:text-lg sm:leading-8">
                  Join practical live classes in artificial intelligence,
                  
                  and modern technology.
                </p>

                <div className="mt-7 flex flex-wrap gap-2 sm:gap-3">
                  <span className="rounded-full border border-line bg-white/75 px-4 py-2 text-xs text-ink shadow-sm backdrop-blur-md dark:border-white/15 dark:bg-white/10 dark:text-white sm:text-sm">
                    Live Zoom classes
                  </span>
                  <span className="rounded-full border border-line bg-white/75 px-4 py-2 text-xs text-ink shadow-sm backdrop-blur-md dark:border-white/15 dark:bg-white/10 dark:text-white sm:text-sm">
                    Hands-on projects
                  </span>
                  <span className="rounded-full border border-line bg-white/75 px-4 py-2 text-xs text-ink shadow-sm backdrop-blur-md dark:border-white/15 dark:bg-white/10 dark:text-white sm:text-sm">
                    Industry skills
                  </span>
                </div>

                <a
                  href="#upcoming-classes"
                  className="mt-8 inline-flex min-h-12 items-center justify-center rounded-lg bg-amber px-6 text-sm font-semibold text-midnight shadow-md transition hover:-translate-y-0.5 hover:bg-coral"
                >
                  Explore upcoming classes
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

      {/* Upcoming classes introduction + Winner of the Month */}
<section className="mx-auto w-full max-w-[1500px] px-4 pb-10 sm:px-6 lg:px-8">
  <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm sm:rounded-3xl">
    <div className="grid items-stretch lg:grid-cols-[minmax(0,1fr)_400px]">
      {/* Left content */}
      <div className="relative flex min-h-full flex-col overflow-hidden p-5 sm:p-8 lg:p-10 xl:p-12">
        {/* Decorative background */}
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

        <div className="relative flex h-full flex-col">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber sm:text-xs">
              Learn live · Hosted on Zoom
            </p>

            <h2 className="mt-3 max-w-3xl font-display text-3xl leading-[1.05] text-ink sm:text-4xl md:text-5xl">
              Upcoming classes you can register for right now.
            </h2>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-ink/60 sm:text-base">
              Pick a class, register with your email, and receive the Zoom link
              directly in your inbox.
            </p>
          </div>

          {/* Benefits */}
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-line bg-chalk/60 p-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber/15 text-lg">
                💻
              </span>

              <h3 className="mt-3 text-sm font-semibold text-ink">
                Live learning
              </h3>

              <p className="mt-1 text-xs leading-5 text-ink/55">
                Learn directly from your instructor on Zoom.
              </p>
            </div>

            <div className="rounded-xl border border-line bg-chalk/60 p-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sage/15 text-lg">
                🛠️
              </span>

              <h3 className="mt-3 text-sm font-semibold text-ink">
                Practical skills
              </h3>

              <p className="mt-1 text-xs leading-5 text-ink/55">
                Practice useful technology skills step by step.
              </p>
            </div>

            <div className="rounded-xl border border-line bg-chalk/60 p-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-coral/10 text-lg">
                🏆
              </span>

              <h3 className="mt-3 text-sm font-semibold text-ink">
                Win rewards
              </h3>

              <p className="mt-1 text-xs leading-5 text-ink/55">
                Answer daily questions and earn leaderboard points.
              </p>
            </div>
          </div>

          {/* Bottom call-to-action */}
          <div className="mt-auto pt-8">
            <a
              href="#upcoming-classes"
              className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-ink px-5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:opacity-90 sm:w-auto"
            >
              Browse upcoming classes
              <span className="ml-2" aria-hidden="true">
                ↓
              </span>
            </a>
          </div>
        </div>
      </div>

      {/* Right content */}
      <div className="border-t border-line bg-chalk/45 p-4 sm:p-6 lg:border-l lg:border-t-0">
        <div className="flex h-full flex-col gap-4">
          {!loading && (upcoming.length > 0 || past.length > 0) && (
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <div className="min-w-0 rounded-xl border border-line bg-surface px-2 py-4 text-center shadow-sm sm:px-3">
                <strong className="block text-xl text-ink sm:text-2xl">
                  {upcoming.length}
                </strong>

                <span className="block truncate font-mono text-[8px] uppercase tracking-wide text-ink/50 sm:text-[10px]">
                  Upcoming
                </span>
              </div>

              <div className="min-w-0 rounded-xl border border-line bg-surface px-2 py-4 text-center shadow-sm sm:px-3">
                <strong className="block text-xl text-ink sm:text-2xl">
                  {past.length}
                </strong>

                <span className="block truncate font-mono text-[8px] uppercase tracking-wide text-ink/50 sm:text-[10px]">
                  Completed
                </span>
              </div>

              <div className="min-w-0 rounded-xl border border-line bg-surface px-2 py-4 text-center shadow-sm sm:px-3">
                <strong className="block text-xl text-ink sm:text-2xl">
                  {totalRegistered}
                </strong>

                <span className="block truncate font-mono text-[8px] uppercase tracking-wide text-ink/50 sm:text-[10px]">
                  Registrations
                </span>
              </div>
            </div>
          )}

          {/* This card can keep increasing */}
          <div className="min-h-0 flex-1 [&>div]:h-full [&>section]:h-full">
            <WinnerOfMonth />
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

        {/* Aside + classes */}
        <section
          id="upcoming-classes"
          className="mx-auto w-full max-w-[1500px] px-4 pb-14 sm:px-6 lg:px-8 scroll-mt-24"
        >
          <div className="min-w-0">
              {loading ? (
                <div>
                  <p className="mb-4 font-mono text-xs uppercase tracking-widest text-ink/40">
                    Loading classes
                  </p>

                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <ClassCardSkeleton key={index} />
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {upcoming.length > 0 && (
                    <section className="animate-fade-in">
                      <div className="mb-5 flex items-center justify-between">
                        <p className="font-mono text-xs uppercase tracking-widest text-ink/40">
                          Upcoming
                        </p>

                        <span className="font-mono text-xs text-ink/40">
                          {upcoming.length}{' '}
                          {upcoming.length === 1 ? 'class' : 'classes'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {upcoming.map((classItem) => (
                          <ClassCard key={classItem.id} item={classItem} />
                        ))}
                      </div>
                    </section>
                  )}

                  {upcoming.length === 0 && (
                    <section className="py-4 text-center">
                      <div className="rounded-2xl border border-line bg-surface px-6 py-12 shadow-sm">
                        <p className="font-display text-2xl text-ink/70">
                          No upcoming classes right now.
                        </p>

                        <p className="mt-2 text-sm text-ink/50 sm:text-base">
                          Check back soon. New technology sessions are added
                          regularly.
                        </p>
                      </div>
                    </section>
                  )}

                  {past.length > 0 && (
                    <section id="past-classes" className="mt-12 border-t border-line pt-10 scroll-mt-24">
                      <div className="mb-5 flex items-center justify-between">
                        <p className="font-mono text-xs uppercase tracking-widest text-ink/40">
                          Past classes
                        </p>

                        <span className="font-mono text-xs text-ink/40">
                          {past.length}{' '}
                          {past.length === 1 ? 'class' : 'classes'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-5 opacity-80 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {past.map((classItem) => (
                          <ClassCard key={classItem.id} item={classItem} />
                        ))}
                      </div>
                    </section>
                  )}
                </>
              )}
          </div>
        </section>
      </main>

      <Footer />
      <ChatWidget />
    </div>
  );
}