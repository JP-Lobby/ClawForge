/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        stone: {
          950: '#0a0907',
          900: '#141210',
          875: '#1c1816',
          850: '#252018',
          800: '#2c2520',
          750: '#3a3028',
          700: '#504030',
        },
        forge: {
          900: '#1c1004',
          800: '#2d1a08',
          700: '#7c2d12',
          600: '#92400e',
          500: '#b45309',
          400: '#d97706',
          300: '#f59e0b',
          200: '#fbbf24',
          100: '#fef3c7',
        },
      },
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'monospace'],
      },
      animation: {
        'forge-pulse': 'forge-pulse 2s cubic-bezier(0.4,0,0.6,1) infinite',
        'enter': 'enter 0.2s ease-out forwards',
      },
      keyframes: {
        'forge-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
        'enter': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
