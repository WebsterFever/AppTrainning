import { useEffect, useState } from 'react';
import { api, ClassItem } from '../lib/api';
import ClassCard from '../components/ClassCard';
import { ClassCardSkeleton } from '../components/Skeletons';
import Header from '../components/Header';
import Footer from '../components/Footer';
import TechnologyAside from "../components/TechnologyAside";

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
    0
  );

  return (
    <div className="flex min-h-screen flex-col bg-chalk text-ink">
      <Header />

    <main className="w-full flex-1">
  <div className="mx-auto flex flex-col lg:flex-row max-w-[1600px] gap-6 lg:gap-8 px-4 py-6">
    <TechnologyAside />

    <div className="flex-1 min-w-0">
        {/* Technology banner */}
        <section className="mx-auto w-full max-w-6xl px-4 pb-8 pt-6 sm:px-6 sm:pb-10 sm:pt-8">
          <div className="relative min-h-[470px] overflow-hidden rounded-2xl border border-line bg-white shadow-lg dark:bg-slate-950 sm:min-h-[500px] sm:rounded-3xl">
            <img
              src="https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=1600&q=80"
              alt="Modern technology and software development"
              className="absolute inset-0 h-full w-full object-cover opacity-20 dark:opacity-35"
            />

            {/* Light and dark mode overlays */}
            <div className="absolute inset-0 bg-gradient-to-r from-white via-white/95 to-white/70 dark:from-slate-950 dark:via-slate-950/90 dark:to-indigo-950/60" />

            <div className="absolute inset-0 bg-gradient-to-t from-white/90 via-transparent to-transparent dark:from-slate-950/80" />

            {/* Decorative background */}
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-amber/10 blur-3xl dark:bg-indigo-500/20" />

            <div className="absolute -bottom-24 left-10 h-64 w-64 rounded-full bg-sage/10 blur-3xl dark:bg-cyan-400/10" />

            {/* Grid effect */}
            <div
              className="absolute inset-0 opacity-[0.04] dark:opacity-[0.06]"
              style={{
                backgroundImage:
                  'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)',
                backgroundSize: '32px 32px',
              }}
            />

            <div className="relative flex min-h-[470px] flex-col items-center justify-end px-5 py-8 text-center sm:min-h-[500px] sm:justify-center sm:px-10 sm:py-12 lg:px-14">
              <div className="max-w-3xl mx-auto">
                <span className="inline-flex items-center gap-2 rounded-full border border-line bg-white/70 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-ink shadow-sm backdrop-blur-md dark:border-white/15 dark:bg-white/10 dark:text-white sm:px-4 sm:py-2 sm:text-xs">
                  <span className="h-2 w-2 rounded-full bg-sage" />
                  Live technology training
                </span>

                <h1 className="mt-5 font-display text-4xl font-bold leading-tight text-ink sm:text-5xl md:text-6xl dark:text-white">
                  Build the technology
                  <span className="block text-amber">
                    skills of tomorrow.
                  </span>
                </h1>

                <p className="mt-4 max-w-2xl mx-auto text-sm leading-6 text-ink/65 sm:mt-5 sm:text-lg sm:leading-8 dark:text-white/75">
                  Join practical live classes in artificial intelligence,
                  software development, cloud computing, DevOps, data science,
                  and modern technology.
                </p>

                <div className="mt-6 flex flex-wrap justify-center gap-2 sm:mt-8 sm:gap-3">
                  <span className="rounded-full border border-line bg-white/70 px-3 py-2 text-xs text-ink shadow-sm backdrop-blur-md dark:border-white/15 dark:bg-white/10 dark:text-white sm:px-4 sm:text-sm">
                    Live Zoom classes
                  </span>

                  <span className="rounded-full border border-line bg-white/70 px-3 py-2 text-xs text-ink shadow-sm backdrop-blur-md dark:border-white/15 dark:bg-white/10 dark:text-white sm:px-4 sm:text-sm">
                    Hands-on projects
                  </span>

                  <span className="rounded-full border border-line bg-white/70 px-3 py-2 text-xs text-ink shadow-sm backdrop-blur-md dark:border-white/15 dark:bg-white/10 dark:text-white sm:px-4 sm:text-sm">
                    Industry skills
                  </span>
                </div>

                <a
                  href="#upcoming-classes"
                  className="mt-7 inline-flex min-h-12 items-center justify-center rounded-lg bg-amber px-6 text-sm font-semibold text-ink shadow-md transition hover:-translate-y-0.5 hover:bg-coral sm:mt-9"
                >
                  Explore upcoming classes
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Introduction */}
        <section className="mx-auto w-full max-w-6xl px-4 pb-8 sm:px-6 sm:pb-10">
          <p className="font-mono text-[11px] uppercase tracking-widest text-amber sm:text-xs">
            Learn live, hosted on Zoom
          </p>

          <h2 className="mt-3 max-w-2xl font-display text-3xl leading-tight text-ink sm:text-4xl md:text-5xl">
            Upcoming classes you can register for right now.
          </h2>

          <p className="mt-3 max-w-xl text-sm leading-6 text-ink/60 sm:text-base">
            Pick a class, register with your email, and receive the Zoom link
            directly in your inbox.
          </p>

          {!loading && (upcoming.length > 0 || past.length > 0) && (
            <div className="mt-6 grid grid-cols-3 gap-2 sm:mt-8 sm:flex sm:flex-wrap sm:gap-x-8 sm:gap-y-2">
              <div className="rounded-lg border border-line bg-surface p-3 text-center shadow-sm sm:border-0 sm:bg-transparent sm:p-0 sm:text-left sm:shadow-none">
                <strong className="block text-lg text-ink sm:inline sm:text-sm">
                  {upcoming.length}
                </strong>

                <span className="font-mono text-[10px] text-ink/50 sm:ml-1 sm:text-xs">
                  upcoming
                </span>
              </div>

              <div className="rounded-lg border border-line bg-surface p-3 text-center shadow-sm sm:border-0 sm:bg-transparent sm:p-0 sm:text-left sm:shadow-none">
                <strong className="block text-lg text-ink sm:inline sm:text-sm">
                  {past.length}
                </strong>

                <span className="font-mono text-[10px] text-ink/50 sm:ml-1 sm:text-xs">
                  completed
                </span>
              </div>

              <div className="rounded-lg border border-line bg-surface p-3 text-center shadow-sm sm:border-0 sm:bg-transparent sm:p-0 sm:text-left sm:shadow-none">
                <strong className="block text-lg text-ink sm:inline sm:text-sm">
                  {totalRegistered}
                </strong>

                <span className="font-mono text-[10px] text-ink/50 sm:ml-1 sm:text-xs">
                  registrations
                </span>
              </div>
            </div>
          )}
        </section>

        {/* Classes */}
        <section id="upcoming-classes">
          {loading ? (
            <div className="mx-auto max-w-6xl px-4 pb-10 sm:px-6">
              <p className="mb-3 font-mono text-xs uppercase tracking-widest text-ink/40">
                Loading classes
              </p>

              <div className="grid grid-cols-1 place-items-center gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <ClassCardSkeleton key={index} />
                ))}
              </div>
            </div>
          ) : (
            <>
              {upcoming.length > 0 && (
                <section className="animate-fade-in mx-auto max-w-6xl px-4 pb-10 sm:px-6">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="font-mono text-xs uppercase tracking-widest text-ink/40">
                      Upcoming
                    </p>

                    <span className="font-mono text-xs text-ink/40">
                      {upcoming.length}{' '}
                      {upcoming.length === 1 ? 'class' : 'classes'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
                    {upcoming.map((classItem) => (
                      <ClassCard key={classItem.id} item={classItem} />
                    ))}
                  </div>
                </section>
              )}

              {upcoming.length === 0 && (
                <section className="mx-auto max-w-6xl px-4 py-12 text-center sm:px-6 sm:py-14">
                  <div className="mx-auto max-w-lg rounded-2xl border border-line bg-surface px-6 py-10 shadow-sm">
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
                <section className="mx-auto mt-4 max-w-6xl border-t border-line px-4 py-8 sm:mt-6 sm:px-6 sm:py-10">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="font-mono text-xs uppercase tracking-widest text-ink/40">
                      Past classes
                    </p>

                    <span className="font-mono text-xs text-ink/40">
                      {past.length}{' '}
                      {past.length === 1 ? 'class' : 'classes'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-4 opacity-80 sm:grid-cols-2 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
                    {past.map((classItem) => (
                      <ClassCard key={classItem.id} item={classItem} />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </section>
        </div>
  </div>
</main>

      <Footer />
    </div>
  );
}