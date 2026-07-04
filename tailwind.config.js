/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Clean & light — off-white page, white cards, near-black text, a single
        // crisp green accent. `royal` stays the brand-accent token name; `ink`
        // is the near-black text/dark scale; `bone` maps to light surfaces so the
        // editorial-era class names keep working while reading light.
        royal: {
          DEFAULT: '#15a34a', // crisp green — the one accent
          dark: '#128040',
          glow: '#22c55e',
          soft: '#18ab50',
        },
        pitch: {
          DEFAULT: '#15a34a', // success / correct
          dark: '#128040',
          glow: '#22c55e',
        },
        ink: {
          // Near-black text + dark-element scale (zinc-like).
          900: '#18181b',
          800: '#27272a',
          700: '#3f3f46',
          600: '#52525b',
          500: '#71717a',
        },
        // Surface/foreground helpers so `text-bone`/`bg-bone` etc. read light.
        bone: {
          DEFAULT: '#18181b', // "primary text" now near-black on light
          dim: '#52525b', // secondary
          faint: '#8a8a90', // tertiary / faint
        },
        paper: '#ffffff', // card surface
        gold: {
          DEFAULT: '#b7791f', // amber (trophies)
          dark: '#96610f',
        },
        danger: '#dc2626',
        good: '#15a34a',
      },
      fontFamily: {
        // Clean sans-serif throughout; mono reserved for codes/figures.
        display: ['system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Helvetica', 'Arial', 'sans-serif'],
        sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['ui-monospace', '"SF Mono"', 'Menlo', 'Consolas', '"Liberation Mono"', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 24px rgba(47, 158, 96, 0.4)',
        'glow-lg': '0 0 60px rgba(47, 158, 96, 0.45)',
        gold: '0 0 28px rgba(217, 164, 65, 0.4)',
        card: '0 10px 40px rgba(0, 0, 0, 0.45)',
        // Soft drop shadow for the white list-cards on the graphite stage.
        lite: '0 1px 2px rgba(0, 0, 0, 0.12), 0 8px 24px -8px rgba(0, 0, 0, 0.3)',
        'lite-hover': '0 2px 6px rgba(0, 0, 0, 0.14), 0 14px 34px -8px rgba(0, 0, 0, 0.4)',
        // Elevation scale for consistent depth.
        'elev-1': '0 1px 2px rgba(0,0,0,0.35), 0 4px 12px rgba(0,0,0,0.30)',
        'elev-2': '0 2px 6px rgba(0,0,0,0.40), 0 16px 48px rgba(0,0,0,0.55)',
      },
      transitionTimingFunction: {
        // Crisp, premium ease-out (expo-like) for entrances & lifts.
        premium: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      backgroundImage: {
        'pitch-radial':
          'radial-gradient(circle at 50% 0%, rgba(47,158,96,0.10), transparent 60%)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.92)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'rise-in': {
          '0%': { opacity: '0', transform: 'translateY(16px) scale(0.985)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%, 60%': { transform: 'translateX(-8px)' },
          '40%, 80%': { transform: 'translateX(8px)' },
        },
        bump: {
          '0%': { transform: 'scale(1)' },
          '40%': { transform: 'scale(1.35)', color: '#2f9e60' },
          '100%': { transform: 'scale(1)' },
        },
        'goal-pop': {
          '0%': { opacity: '0', transform: 'scale(0.3) rotate(-8deg)' },
          '50%': { opacity: '1', transform: 'scale(1.15) rotate(2deg)' },
          '70%': { transform: 'scale(0.95) rotate(-1deg)' },
          '100%': { opacity: '1', transform: 'scale(1) rotate(0)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 18px rgba(47,158,96,0.35)' },
          '50%': { boxShadow: '0 0 40px rgba(47,158,96,0.6)' },
        },
        'spin-slow': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        confetti: {
          '0%': { transform: 'translateY(-10vh) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'translateY(110vh) rotate(720deg)', opacity: '0' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out both',
        'scale-in': 'scale-in 0.35s cubic-bezier(0.22,1,0.36,1) both',
        'rise-in': 'rise-in 0.55s cubic-bezier(0.16,1,0.3,1) both',
        'slide-up': 'slide-up 0.45s cubic-bezier(0.22,1,0.36,1) both',
        shake: 'shake 0.4s ease-in-out',
        bump: 'bump 0.5s ease-out',
        'goal-pop': 'goal-pop 0.6s cubic-bezier(0.18,1.4,0.4,1) both',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'spin-slow': 'spin-slow 14s linear infinite',
      },
    },
  },
  plugins: [],
};
