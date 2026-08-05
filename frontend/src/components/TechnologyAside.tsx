import { useEffect, useState } from 'react';

type Banner = {
  label: string;
  title: string;
  description: string;
  technology: string;
  action: string;
  href: string;
  imageUrl: string;
  items?: string[];
};

const banners: Banner[] = [
  {
    label: 'Welcome',
    title: 'Webster Technology School',
    description:
      'Learn practical technology skills through live, interactive and career-focused classes.',
    technology: 'Learn. Build. Grow.',
    action: 'Explore our classes',
    href: '#upcoming-classes',
    imageUrl:
      'https://imageio.forbes.com/specials-images/imageserve/66e8ad4b29ea61509edd8b63/0x0.jpg?format=jpg&height=900&width=1600&fit=bounds',
    items: [
      'Live Zoom classes',
      'Hands-on projects',
      'Beginner-friendly training',
    ],
  },
  {
    label: 'Next live class',
    title: 'AI Engineer – Beginner to Advanced',
    description:
      'Learn artificial intelligence, React, Node.js, Python, RAG, AI agents and modern application development.',
    technology: 'Live on Zoom',
    action: 'Register now',
    href: '#upcoming-classes',
    imageUrl:
      'https://www.aiu.edu/wp-content/uploads/2024/04/72-1024x550.webp',
    items: [
      'Live instructor',
      'Practical projects',
      'Beginner to advanced',
    ],
  },
  {
    label: 'Why choose us',
    title: 'Practical Education for Your Future',
    description:
      'Our programs are designed to help students build useful skills and create real professional projects.',
    technology: 'Career-focused learning',
    action: 'View our programs',
    href: '#upcoming-classes',
    imageUrl:
      'https://static.canadianmetalworking.com/a/invest-in-new-technology-regardless-of-size-cost-1635773656.jpg',
    items: [
      'Live instructor-led classes',
      'Small learning groups',
      'Professional certificates',
      'Real-world projects',
    ],
  },
  {
    label: 'Learning roadmap',
    title: 'Start From the Basics and Become Job-Ready',
    description:
      'Follow a clear learning path designed to take you from beginner computer skills to advanced technology development.',
    technology: 'Your learning journey',
    action: 'Start learning',
    href: '#upcoming-classes',
    imageUrl:
      'https://www.ineteconomics.org/uploads/featured/iStock-1171902434.jpg',
    items: [
      'Computer basics',
      'Programming fundamentals',
      'React and Node.js',
      'Artificial intelligence',
      'AI Engineer',
    ],
  },
  {
    label: 'Career opportunities',
    title: 'Prepare for Technology Careers',
    description:
      'Develop practical skills that can prepare you for modern careers in software development, cloud computing, data and AI.',
    technology: 'Build your career',
    action: 'Explore career classes',
    href: '#upcoming-classes',
    imageUrl:
      'https://imageio.forbes.com/specials-images/imageserve/66e8ad4b29ea61509edd8b63/0x0.jpg?format=jpg&height=900&width=1600&fit=bounds',
    items: [
      'AI Engineer',
      'Full Stack Developer',
      'Frontend Developer',
      'Backend Developer',
      'Cloud Engineer',
    ],
  },
  {
    label: 'Technologies',
    title: 'Learn Modern Industry Tools',
    description:
      'Work with the technologies used to build, deploy and maintain professional applications.',
    technology: 'Tools you will learn',
    action: 'View technology classes',
    href: '#upcoming-classes',
    imageUrl:
      'https://static.canadianmetalworking.com/a/invest-in-new-technology-regardless-of-size-cost-1635773656.jpg',
    items: [
      'React',
      'Node.js',
      'Python',
      'TypeScript',
      'OpenAI',
      'Docker',
      'AWS',
      'PostgreSQL',
    ],
  },
  {
    label: 'Announcements',
    title: 'New Courses and Programs',
    description:
      'Stay informed about upcoming classes, registration dates and new programs at Webster Technology School.',
    technology: 'Latest school updates',
    action: 'View upcoming classes',
    href: '#upcoming-classes',
    imageUrl:
      'https://www.ineteconomics.org/uploads/featured/iStock-1171902434.jpg',
    items: [
      'AI Engineer program available',
      'English beginner classes',
      'Computer basics classes',
      'More courses coming soon',
    ],
  },
  {
    label: 'Student reviews',
    title: 'Learn With Confidence',
    description:
      'Our goal is to provide clear explanations, practical activities and a supportive learning experience.',
    technology: 'Student experience',
    action: 'Join our students',
    href: '#upcoming-classes',
    imageUrl:
      'https://www.aiu.edu/wp-content/uploads/2024/04/72-1024x550.webp',
    items: [
      '★★★★★ Practical lessons',
      '★★★★★ Clear explanations',
      '★★★★★ Supportive instructor',
    ],
  },
  {
    label: 'Need help?',
    title: 'We Are Here to Support You',
    description:
      'Have questions about registration, class levels or course schedules? Contact our school for assistance.',
    technology: 'Student support',
    action: 'Contact us',
    href: 'mailto:support@webstertechnologyschool.com',
    imageUrl:
      'https://static.canadianmetalworking.com/a/invest-in-new-technology-regardless-of-size-cost-1635773656.jpg',
    items: [
      'Course information',
      'Registration assistance',
      'Technical support',
    ],
  },
  {
    label: 'Enroll today',
    title: 'Start Your Technology Journey',
    description:
      'Choose a course, register online and begin building the skills needed for your education and career.',
    technology: 'Your future starts here',
    action: 'Enroll today',
    href: '#upcoming-classes',
    imageUrl:
      'https://imageio.forbes.com/specials-images/imageserve/66e8ad4b29ea61509edd8b63/0x0.jpg?format=jpg&height=900&width=1600&fit=bounds',
    items: [
      'Choose your course',
      'Register online',
      'Receive your Zoom link',
      'Start learning',
    ],
  },
];

export default function TechnologyAside() {
  const [currentBanner, setCurrentBanner] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) {
      return;
    }

    const interval = window.setInterval(() => {
      setCurrentBanner((current) => (current + 1) % banners.length);
    }, 6000);

    return () => window.clearInterval(interval);
  }, [isPaused]);

  const banner = banners[currentBanner];

  const previousBanner = () => {
    setCurrentBanner(
      (current) => (current - 1 + banners.length) % banners.length,
    );
  };

  const nextBanner = () => {
    setCurrentBanner((current) => (current + 1) % banners.length);
  };

  return (
    <aside
      className="w-full"
      aria-label="School information and announcements"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="relative h-[520px] w-full overflow-hidden rounded-2xl border border-line shadow-lg sm:h-[560px] lg:h-[600px]">
        <img
          key={banner.imageUrl}
          src={banner.imageUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover animate-fade-in"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/75 to-slate-950/25" />

        <div className="relative z-10 flex h-full flex-col justify-between p-5 text-white sm:p-6 lg:p-7">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/30 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-white backdrop-blur-md">
              <span className="h-1.5 w-1.5 rounded-full bg-amber" />
              {banner.label}
            </span>

            <span className="rounded-full border border-white/20 bg-black/30 px-3 py-1.5 font-mono text-[10px] text-white/80 backdrop-blur-md">
              {String(currentBanner + 1).padStart(2, '0')} /{' '}
              {String(banners.length).padStart(2, '0')}
            </span>
          </div>

          <div
            key={currentBanner}
            className="animate-fade-in rounded-xl border border-white/15 bg-black/45 p-5 shadow-xl backdrop-blur-md sm:p-6 lg:p-7"
          >
            <p className="font-mono text-xs uppercase tracking-widest text-amber">
              {banner.technology}
            </p>

            <h2 className="mt-2 font-display text-2xl font-semibold leading-tight text-white sm:text-3xl">
              {banner.title}
            </h2>

            <p className="mt-3 text-sm leading-6 text-white/75 sm:text-base sm:leading-7">
              {banner.description}
            </p>

            {banner.items && (
              <div className="mt-4 flex flex-wrap gap-2">
                {banner.items.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] text-white/90 backdrop-blur-sm sm:text-xs"
                  >
                    {item}
                  </span>
                ))}
              </div>
            )}

            <a
              href={banner.href}
              className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-amber px-5 text-sm font-semibold text-midnight shadow-md transition hover:-translate-y-0.5 hover:bg-coral"
            >
              {banner.action}
              <span aria-hidden="true">→</span>
            </a>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex max-w-[68%] items-center gap-1.5 overflow-hidden">
              {banners.map((item, index) => (
                <button
                  key={item.title}
                  type="button"
                  aria-label={`Open slide ${index + 1}: ${item.label}`}
                  aria-current={index === currentBanner ? 'true' : undefined}
                  onClick={() => setCurrentBanner(index)}
                  className={`h-1.5 flex-shrink-0 rounded-full transition-all ${
                    index === currentBanner
                      ? 'w-6 bg-amber'
                      : 'w-1.5 bg-white/35 hover:bg-white/60'
                  }`}
                />
              ))}
            </div>

            <div className="flex flex-shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={previousBanner}
                aria-label="Previous slide"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/30 text-white backdrop-blur-md transition hover:bg-white/20"
              >
                ←
              </button>

              <button
                type="button"
                onClick={nextBanner}
                aria-label="Next slide"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/30 text-white backdrop-blur-md transition hover:bg-white/20"
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