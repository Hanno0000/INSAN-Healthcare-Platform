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
        // INSAN Design System (Clinic Template Migration)
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
        heading: '#112344',
        accent: {
          DEFAULT: '#175cdd',
          500: '#175cdd',
        },
        default: '#3c4049',
        surface: '#ffffff',
        'light-bg': '#f4f8ff',
        'dark-bg': '#021418',
        'dark-surface': '#11262a',
        future: '#1B4FCC',
        delta: '#0E7C86',
      },
      fontFamily: {
        sans: ['var(--font-cairo)', 'Cairo', 'sans-serif'],
        arabic: ['var(--font-cairo)', 'Cairo', 'sans-serif'],
        roboto: ['var(--font-roboto)', 'Roboto', 'sans-serif'],
        montserrat: ['var(--font-montserrat)', 'Montserrat', 'sans-serif'],
        lato: ['var(--font-lato)', 'Lato', 'sans-serif'],
      },
      borderRadius: {
        pill: '50px',
        card: '16px',
      },
      boxShadow: {
        'card-hover': '0px 2px 20px rgba(0, 0, 0, 0.08)',
        'floating': '0px 0px 30px rgba(0, 0, 0, 0.1)',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};

export default config;
