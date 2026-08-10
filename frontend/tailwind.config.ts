import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      boxShadow: {
        soft: '0 18px 60px rgba(15, 23, 42, 0.18)',
      },
      backgroundImage: {
        'hero-gradient': 'radial-gradient(circle at top, rgba(96, 165, 250, 0.16), transparent 28%), linear-gradient(180deg, #0f172a 0%, #020617 100%)',
      },
    },
  },
  plugins: [],
};

export default config;
