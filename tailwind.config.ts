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
        slideUp: {
          from: { transform: 'translateY(20px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          from: { transform: 'scale(0.96)', opacity: '0' },
          to: { transform: 'scale(1)', opacity: '1' },
        },
        // A bar sliding across, for waits with no known end.
        indeterminate: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(250%)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.18s ease-out',
        slideUp: 'slideUp 0.24s cubic-bezier(0.16, 1, 0.3, 1)',
        scaleIn: 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        indeterminate: 'indeterminate 1.4s ease-in-out infinite',
        shimmer: 'shimmer 1.8s linear infinite',
      },
      colors: {
        cellar: {
          700: '#332c2f',
          800: '#231e20',
          850: '#1a1618',
          900: '#141112',
          950: '#0c0a09',
        },
        wine: {
          50: '#fcf2f4',
          100: '#f9e5e9',
          200: '#f2ccd4',
          300: '#e7a4b3',
          400: '#d57087',
          500: '#b53852',
          600: '#9a2640',
          700: '#7e1d34',
          800: '#641729',
          900: '#47101e',
          950: '#2a0912',
        },
        champagne: {
          50: '#fbf8f3',
          100: '#f5efe4',
          200: '#e9dcc6',
          300: '#d9c39e',
          400: '#c8a872',
          500: '#b69054',
          600: '#99753e',
          700: '#7a5c31',
          800: '#5b4425',
          900: '#3d2d19',
          950: '#21180d',
          gold: '#d4b06a',
          light: '#fbf7ee',
          accent: '#e8d5b2',
        },
        velvet: {
          900: '#1a1618',
          950: '#0c0a09',
        },
      },
      fontFamily: {
        serif: ['var(--font-serif)', 'Cormorant Garamond', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'luxury': '0 10px 30px -5px rgba(0, 0, 0, 0.55), 0 0 1px 1px rgba(244, 236, 224, 0.08)',
        'luxury-glow': '0 8px 30px -4px rgba(126, 29, 52, 0.35), 0 0 15px 0 rgba(212, 176, 106, 0.12)',
        'gold-glow': '0 0 20px -2px rgba(212, 176, 106, 0.25)',
      },
      letterSpacing: {
        widest: '.2em',
        luxury: '.15em',
      },
    },
  },
  plugins: [],
};
export default config;
