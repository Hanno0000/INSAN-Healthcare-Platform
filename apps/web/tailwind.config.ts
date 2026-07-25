import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // INSAN Design System colors (from 08_DESIGN_SYSTEM.md)
        primary: {
          DEFAULT: '#0B1F3A',
          50: '#e8edf5',
          100: '#c5d0e4',
          900: '#0B1F3A',
        },
        secondary: {
          DEFAULT: '#0E7C86',
          500: '#0E7C86',
        },
        accent: {
          DEFAULT: '#0B5FFF',
          500: '#0B5FFF',
        },
        future: '#1B4FCC',
        delta: '#0E7C86',
      },
      fontFamily: {
        sans: ['var(--font-cairo)', 'Cairo', 'sans-serif'],
        arabic: ['var(--font-cairo)', 'Cairo', 'sans-serif'],
        latin: ['var(--font-inter)', 'Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
