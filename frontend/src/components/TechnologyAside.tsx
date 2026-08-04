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
    imageUrl: 'https://imageio.forbes.com/specials-images/imageserve/66e8ad4b29ea61509edd8b63/0x0.jpg?format=jpg&height=900&width=1600&fit=bounds',
  },
  {
    label: 'Live training',
    title: 'Build Modern Applications',
    description:
      'Create professional applications using React, Node.js, databases and cloud services.',
    technology: 'React + Node.js',
    action: 'View development classes',
    imageUrl: 'https://static.canadianmetalworking.com/a/invest-in-new-technology-regardless-of-size-cost-1635773656.jpg',
  },
  {
    label: 'Career path',
    title: 'Master Cloud and DevOps',
    description:
      'Learn Docker, Kubernetes, CI/CD, AWS and modern deployment practices.',
    technology: 'AWS + DevOps',
    action: 'Explore DevOps classes',
    imageUrl: 'https://www.ineteconomics.org/uploads/featured/iStock-1171902434.jpg',
  },
  {
    label: 'Data program',
    title: 'Turn Data Into Decisions',
    description:
      'Study Python, SQL, data visualization, statistics and machine learning.',
    technology: 'Data Science',
    action: 'View data classes',
    imageUrl: 'https://www.aiu.edu/wp-content/uploads/2024/04/72-1024x550.webp',
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

  return (
    <aside className="w-full lg:basis-[40%] lg:max-w-[40%] lg:flex-shrink-0">
      <div className="relative h-[500px] lg:h-full lg:min-h-[620px] overflow-hidden rounded-sm border border-line shadow-sm">
        <img
          key={currentBanner}
          src={banner.imageUrl}
          alt={banner.technology}
          className="absolute inset-0 h-full w-full object-cover animate-fade-in"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-chalk via-chalk/65 to-transparent" />

        <div className="relative flex h-full flex-col justify-between p-6">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/80 px-3 py-1 text-[10px] font-mono uppercase tracking-widest backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-amber" />
              {banner.label}
            </span>

            <span className="rounded-full border border-line bg-surface/80 px-3 py-1 text-[10px] font-mono backdrop-blur">
              {String(currentBanner + 1).padStart(2, '0')} / {String(banners.length).padStart(2, '0')}
            </span>
          </div>

          <div className="rounded-sm bg-surface/90 p-6 backdrop-blur-sm">
            <p className="font-mono text-xs tracking-wide text-amber">
              {banner.technology}
            </p>

            <h2 className="mt-2 font-display text-3xl leading-tight text-ink">
              {banner.title}
            </h2>

            <p className="mt-3 text-base leading-relaxed text-ink/75">
              {banner.description}
            </p>

            <a
              href="#upcoming-classes"
              className="mt-5 inline-flex items-center gap-2 rounded-sm bg-amber px-5 py-3 text-sm font-semibold text-midnight transition hover:bg-amber/90"
            >
              {banner.action}
              <span>→</span>
            </a>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {banners.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentBanner(index)}
                  className={`h-1.5 rounded-full transition-all ${
                    currentBanner === index
                      ? 'w-6 bg-amber'
                      : 'w-2 bg-white/40'
                  }`}
                />
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() =>
                  setCurrentBanner(
                    (currentBanner - 1 + banners.length) % banners.length
                  )
                }
                className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface/80"
              >
                ←
              </button>

              <button
                onClick={() =>
                  setCurrentBanner((currentBanner + 1) % banners.length)
                }
                className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface/80"
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