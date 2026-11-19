import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
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
        linen: {
          50: '#faf7f2',
          100: '#f3ede4',
          200: '#e8dfd2',
          300: '#d8cbb8',
        },
        ink: {
          400: '#9c908a',
          500: '#786c66',
          700: '#4a403c',
          900: '#1e1716',
        },
        wine: {
          50: '#fdf2f4',
          100: '#fae5e9',
          200: '#f4cbd4',
          300: '#e8a1b1',
          400: '#d16b82',
          500: '#b33853',
          600: '#96233e',
          700: '#7e1d34',
          800: '#641628',
          900: '#4b101e',
        },
        champagne: {
          50: '#fdfbf6',
          100: '#f8f2e4',
          200: '#efe2c6',
          300: '#dfca9b',
          400: '#c8a45c',
          500: '#b0883e',
          600: '#966f2b',
          700: '#785720',
          gold: '#c29743',
          deep: '#8e6924',
        },
      },
      fontFamily: {
        serif: ['var(--font-serif)', 'Cormorant Garamond', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'card-soft': '0 2px 12px -3px rgba(38, 24, 18, 0.06), 0 1px 2px rgba(38, 24, 18, 0.03)',
        'elevated': '0 12px 32px -8px rgba(38, 24, 18, 0.14)',
        'wine-glow': '0 8px 22px rgba(126, 29, 52, 0.35)',
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
