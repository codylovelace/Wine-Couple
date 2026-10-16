import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { transform: 'translateY(24px)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
        // A bar sliding across, for waits with no known end.
        indeterminate: { '0%': { transform: 'translateX(-100%)' }, '100%': { transform: 'translateX(250%)' } },
      },
      animation: {
        fadeIn: 'fadeIn 0.2s ease-out',
        slideUp: 'slideUp 0.25s ease-out',
        indeterminate: 'indeterminate 1.4s ease-in-out infinite',
      },
      colors: {
        wine: {
          50: '#fcf2f4',
          100: '#f9e7eb',
          200: '#f5d1d9',
          300: '#edaebd',
          400: '#e07e96',
          500: '#cf5273',
          600: '#b83457',
          700: '#9b2444',
          800: '#81203b',
          900: '#521223',
          950: '#2f0611',
        },
        champagne: {
          50: '#faf8f5',
          100: '#f5f0e8',
          200: '#eae0cf',
          300: '#ddcbb2',
          400: '#cbb08f',
          500: '#b8946e',
          600: '#a37c58',
          700: '#856145',
          800: '#6c4f3a',
          900: '#584132',
          950: '#2e2017',
          gold: '#d4af37',
          light: '#f7f2e7',
          accent: '#e5cfab',
        },
        velvet: {
          900: '#1a0c13',
          950: '#0d080b',
        }
      },
      fontFamily: {
        serif: ['var(--font-serif)', 'Cormorant Garamond', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'luxury': '0 10px 30px -5px rgba(0, 0, 0, 0.5), 0 0 1px 1px rgba(229, 207, 171, 0.1)',
        'luxury-glow': '0 8px 30px -4px rgba(130, 20, 45, 0.35), 0 0 15px 0 rgba(212, 175, 55, 0.12)',
        'gold-glow': '0 0 20px -2px rgba(212, 175, 55, 0.25)',
      },
      letterSpacing: {
        widest: '.2em',
        luxury: '.15em',
      }
    },
  },
  plugins: [],
};
export default config;
