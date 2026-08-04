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
