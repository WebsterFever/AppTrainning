import { useEffect, useState } from 'react';

type Banner = {
  label: string;
  title: string;
  description: string;
  technology: string;
  action: string;
  imageUrl: string;
};

const banners: Banner[] = [
  {
    label: 'New program',
    title: 'Become an AI Engineer',
    description:
      'Learn generative AI, large language models, RAG, APIs and intelligent agents.',
    technology: 'AI + Python',
    action: 'Explore AI classes',
    imageUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&q=80',
  },
  {
    label: 'Live training',
    title: 'Build Modern Applications',
    description:
      'Create professional applications using React, Node.js, databases and cloud services.',
    technology: 'React + Node.js',
    action: 'View development classes',
    imageUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&q=80',
  },
  {
    label: 'Career path',
    title: 'Master Cloud and DevOps',
    description: 'Learn Docker, Kubernetes, CI/CD, AWS and modern deployment practices.',
    technology: 'AWS + DevOps',
    action: 'Explore DevOps classes',
    imageUrl: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=800&q=80',
  },
  {
    label: 'Data program',
    title: 'Turn Data Into Decisions',
    description: 'Study Python, SQL, data visualization, statistics and machine learning.',
    technology: 'Data Science',
    action: 'View data classes',
    imageUrl: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800&q=80',
  },
];

export default function TechnologyAside() {
  const [currentBanner, setCurrentBanner] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setCurrentBanner((current) => (current + 1) % banners.length);
    }, 5000);
    return () => window.clearInterval(interval);
  }, []);

  const banner = banners[currentBanner];

  const previousBanner = () =>
    setCurrentBanner((current) => (current - 1 + banners.length) % banners.length);
  const nextBanner = () => setCurrentBanner((current) => (current + 1) % banners.length);

  return (
    <aside className="w-full lg:w-72 xl:w-80 flex-shrink-0">
      <div className="relative h-64 sm:h-72 lg:h-full lg:min-h-[540px] rounded-sm overflow-hidden border border-line shadow-sm">
        <img
          key={currentBanner}
          src={banner.imageUrl}
          alt={banner.technology}
          className="absolute inset-0 w-full h-full object-cover animate-fade-in"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-chalk via-chalk/70 to-chalk/20" />

        <div className="relative h-full flex flex-col justify-between p-5">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-ink/90 bg-surface/70 backdrop-blur-sm rounded-full px-2.5 py-1 border border-line">
              <span className="w-1.5 h-1.5 rounded-full bg-amber" />
              {banner.label}
            </span>
            <span className="font-mono text-[10px] text-ink/60 bg-surface/70 backdrop-blur-sm rounded-full px-2 py-1 border border-line">
              {String(currentBanner + 1).padStart(2, '0')} / {String(banners.length).padStart(2, '0')}
            </span>
          </div>

          <div
            key={`body-${currentBanner}`}
            className="animate-fade-in bg-surface/85 backdrop-blur-sm rounded-sm p-3 -mx-1"
          >
            <p className="font-mono text-xs text-amber tracking-wide">{banner.technology}</p>
            <h2 className="font-display text-2xl leading-tight text-ink mt-2">{banner.title}</h2>
            <p className="text-sm text-ink/75 mt-2 leading-relaxed">{banner.description}</p>
            <a
              href="#upcoming-classes"
              className="inline-flex items-center gap-2 mt-4 bg-amber text-midnight text-sm font-semibold px-4 py-2 rounded-sm hover:bg-amber/90 transition-colors"
            >
              {banner.action}
              <span aria-hidden="true">→</span>
            </a>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {banners.map((item, index) => (
                <button
                  key={item.title}
                  type="button"
                  aria-label={`Open banner ${index + 1}`}
                  onClick={() => setCurrentBanner(index)}
                  className={`h-1.5 rounded-full transition-all ${
                    index === currentBanner ? 'w-5 bg-amber' : 'w-1.5 bg-ink/30'
                  }`}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={previousBanner}
                aria-label="Previous announcement"
                className="w-7 h-7 flex items-center justify-center rounded-full bg-surface/70 border border-line text-ink hover:bg-surface transition-colors"
              >
                ←
              </button>
              <button
                type="button"
                onClick={nextBanner}
                aria-label="Next announcement"
                className="w-7 h-7 flex items-center justify-center rounded-full bg-surface/70 border border-line text-ink hover:bg-surface transition-colors"
              >
                →
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
