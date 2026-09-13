/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ivory: '#F3EACC',
        cream: '#FAF6EC',
        parchment: '#F7F1E3',
        sand: '#E8DFD0',
        royal: {
          DEFAULT: '#123C35',
          mid: '#174A40',
          deep: '#0F3D35',
          soft: '#1A5248',
        },
        gold: {
          DEFAULT: '#B08A45',
          light: '#C2A15A',
          muted: '#A98242',
        },
        terracotta: {
          DEFAULT: '#B85C38',
          dark: '#9A4A2C',
          deep: '#8B3A2A',
          light: '#E8C4B0',
        },
        maroon: {
          DEFAULT: '#5A1F24',
          mid: '#681F26',
        },
        teal: {
          DEFAULT: '#174A40',
          deep: '#0F3D35',
        },
        indigo: {
          DEFAULT: '#174A40',
          deep: '#0F3D35',
          soft: '#D4E5E0',
        },
        mustard: '#C9A227',
        forest: {
          DEFAULT: '#123C35',
          soft: '#3F6B52',
        },
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
        header: '0 8px 24px rgba(15, 61, 53, 0.18)',
      },
      borderRadius: {
        card: '0.5rem',
      },
      maxWidth: {
        market: '1280px',
      },
    },
  },
  plugins: [],
};
