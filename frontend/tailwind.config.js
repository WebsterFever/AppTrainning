/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: 'rgb(var(--c-ink) / <alpha-value>)',
        chalk: 'rgb(var(--c-chalk) / <alpha-value>)',
        line: 'rgb(var(--c-line) / <alpha-value>)',
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        amber: '#E8A33D',
        sage: '#4F7965',
        coral: '#E4572E',
        // Fixed, non-theme-reactive — used only for the admin login "spotlight" screen.
        midnight: '#151B3B',
        cream: '#F5F3EE',
        // Lesson reader — see index.css for the light/dark values these
        // resolve to. Deliberately separate from ink/chalk/line/surface
        // above: the reading surface intentionally does NOT invert with
        // the rest of the site (see index.css comment).
        lessonPage: 'rgb(var(--lesson-page-bg) / <alpha-value>)',
        lessonSurface: 'rgb(var(--lesson-surface) / <alpha-value>)',
        lessonText: 'rgb(var(--lesson-text) / <alpha-value>)',
        lessonTextMuted: 'rgb(var(--lesson-text-muted) / <alpha-value>)',
        lessonBorder: 'rgb(var(--lesson-border) / <alpha-value>)',
        lessonNav: 'rgb(var(--lesson-nav-bg) / <alpha-value>)',
        lessonNavText: 'rgb(var(--lesson-nav-text) / <alpha-value>)',
        lessonNavTextMuted: 'rgb(var(--lesson-nav-text-muted) / <alpha-value>)',
        lessonNavBorder: 'rgb(var(--lesson-nav-border) / <alpha-value>)',
        lessonNavActive: 'rgb(var(--lesson-nav-active-bg) / <alpha-value>)',
        lessonNavActiveBorder: 'rgb(var(--lesson-nav-active-border) / <alpha-value>)',
      },
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};
