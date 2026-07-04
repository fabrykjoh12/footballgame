/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Ball Knowledge palette — deep indigo/purple stage, white cards,
        // indigo primary CTA, green kept as a success accent (playfootball.games
        // family look).
        royal: {
          DEFAULT: '#5b4bd6', // indigo — primary CTA ("Play")
          dark: '#4a3bb8',
          glow: '#7c6ef0',
          soft: '#6b5be0',
        },
        pitch: {
          DEFAULT: '#16c974', // success / correct accent (grass green)
          dark: '#0fa85e',
          glow: '#2ee08c',
        },
        ink: {
          // Repurposed as the indigo/purple stage scale — every bg-ink-* now
          // reads purple, repainting the whole app in one place.
          900: '#140a33', // deepest — body backdrop
          800: '#1d1147', // panel base
          700: '#271a5c',
          600: '#33236f',
          500: '#3f2c84',
        },
        gold: {
          DEFAULT: '#ffd24a',
          dark: '#e0b020',
        },
        danger: '#ff4d6a',
        good: '#16c974',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 24px rgba(91, 75, 214, 0.45)',
        'glow-lg': '0 0 60px rgba(91, 75, 214, 0.5)',
        gold: '0 0 28px rgba(255, 210, 74, 0.45)',
        card: '0 10px 40px rgba(0, 0, 0, 0.45)',
        // Soft drop shadow for the white list-cards on the purple stage.
        lite: '0 1px 2px rgba(20, 10, 51, 0.10), 0 8px 24px -8px rgba(20, 10, 51, 0.25)',
        'lite-hover': '0 2px 6px rgba(20, 10, 51, 0.12), 0 14px 34px -8px rgba(20, 10, 51, 0.35)',
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
          'radial-gradient(circle at 50% 0%, rgba(124,110,240,0.18), transparent 60%)',
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
          '40%': { transform: 'scale(1.35)', color: '#16c974' },
          '100%': { transform: 'scale(1)' },
        },
        'goal-pop': {
          '0%': { opacity: '0', transform: 'scale(0.3) rotate(-8deg)' },
          '50%': { opacity: '1', transform: 'scale(1.15) rotate(2deg)' },
          '70%': { transform: 'scale(0.95) rotate(-1deg)' },
          '100%': { opacity: '1', transform: 'scale(1) rotate(0)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 18px rgba(91,75,214,0.4)' },
          '50%': { boxShadow: '0 0 40px rgba(91,75,214,0.75)' },
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
