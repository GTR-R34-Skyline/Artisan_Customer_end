/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ivory: '#F6F1E8',
        cream: '#FAF7F1',
        sand: '#EDE6D9',
        terracotta: {
          DEFAULT: '#B85C38',
          dark: '#9A4A2C',
          light: '#E8C4B0',
        },
        indigo: {
          DEFAULT: '#2F3A64',
          deep: '#1E2748',
          soft: '#D8DCEB',
        },
        mustard: '#C9A227',
        forest: '#3F6B52',
        charcoal: '#2B2723',
        stone: {
          950: '#2B2723',
          900: '#3A3530',
          800: '#524C45',
          700: '#6F675E',
          600: '#8A8176',
          500: '#A39A8E',
          400: '#C4BBAF',
          300: '#DDD4C8',
          200: '#E8E0D4',
          100: '#F3EDE2',
        },
      },
      fontFamily: {
        display: ['Fraunces', 'Noto Serif', 'Georgia', 'serif'],
        sans: ['Plus Jakarta Sans', 'Noto Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 10px 28px rgba(43, 39, 35, 0.06)',
        lift: '0 16px 36px rgba(43, 39, 35, 0.1)',
        header: '0 8px 24px rgba(43, 39, 35, 0.04)',
      },
      borderRadius: {
        card: '0.35rem',
      },
      maxWidth: {
        market: '1280px',
      },
    },
  },
  plugins: [],
};
