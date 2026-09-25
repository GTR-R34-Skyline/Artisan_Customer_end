/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        /* Legacy token names remapped to the royal Indian e-commerce palette */
        ivory: '#FAF7F2',
        cream: '#FAF7F2',
        parchment: '#F7F2E4',
        sand: '#EFE8DC',
        royal: {
          DEFAULT: '#111E38',
          mid: '#1B2A4A',
          deep: '#0D1628',
          soft: '#243556',
        },
        gold: {
          DEFAULT: '#D4AF37',
          light: '#F7F2E4',
          muted: '#C4A030',
        },
        terracotta: {
          DEFAULT: '#B33917',
          dark: '#8C2B10',
          deep: '#8C2B10',
          light: '#F0D5C8',
        },
        maroon: {
          DEFAULT: '#8C2B10',
          mid: '#B33917',
        },
        teal: {
          DEFAULT: '#1B2A4A',
          deep: '#111E38',
        },
        indigo: {
          DEFAULT: '#1B2A4A',
          deep: '#111E38',
          soft: '#E8ECF4',
        },
        mustard: '#D4AF37',
        forest: {
          DEFAULT: '#111E38',
          soft: '#3D4A5C',
        },
        charcoal: '#2D3748',
        stone: {
          950: '#2D3748',
          900: '#3D4A5C',
          800: '#4A5568',
          700: '#5A6578',
          600: '#6B7280',
          500: '#8A92A0',
          400: '#A8B0BC',
          300: '#CBD0D8',
          200: '#EFE8DC',
          100: '#F7F2E4',
        },
        artisan: {
          indigo: {
            royal: '#111E38',
            mid: '#1B2A4A',
          },
          terracotta: {
            DEFAULT: '#B33917',
            dark: '#8C2B10',
          },
          gold: {
            DEFAULT: '#D4AF37',
            light: '#F7F2E4',
          },
          silk: '#FAF7F2',
          white: '#FFFFFF',
          border: '#EFE8DC',
          body: '#2D3748',
        },
      },
      fontFamily: {
        display: ['Fraunces', 'Noto Serif', 'Georgia', 'serif'],
        sans: ['Plus Jakarta Sans', 'Noto Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 10px 28px rgba(17, 30, 56, 0.06)',
        lift: '0 16px 36px rgba(17, 30, 56, 0.1)',
        header: '0 8px 24px rgba(17, 30, 56, 0.22)',
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
