/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Ball Knowledge palette — dark stadium + neon pitch green
        pitch: {
          DEFAULT: '#16ff7a', // neon pitch green (primary accent)
          dark: '#0fbf5c',
          glow: '#39ff9c',
        },
        ink: {
          900: '#05070d', // near-black background base
          800: '#0a0f1c', // deep navy
          700: '#0f1626',
          600: '#16203a',
          500: '#1e2b4d',
        },
        gold: {
          DEFAULT: '#ffd24a',
          dark: '#e0b020',
        },
        danger: '#ff4d5e',
        good: '#16ff7a',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 24px rgba(22, 255, 122, 0.35)',
        'glow-lg': '0 0 60px rgba(22, 255, 122, 0.45)',
        gold: '0 0 28px rgba(255, 210, 74, 0.45)',
        card: '0 10px 40px rgba(0, 0, 0, 0.45)',
      },
      backgroundImage: {
        'pitch-radial':
          'radial-gradient(circle at 50% 0%, rgba(22,255,122,0.12), transparent 60%)',
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
          '40%': { transform: 'scale(1.35)', color: '#16ff7a' },
          '100%': { transform: 'scale(1)' },
        },
        'goal-pop': {
          '0%': { opacity: '0', transform: 'scale(0.3) rotate(-8deg)' },
          '50%': { opacity: '1', transform: 'scale(1.15) rotate(2deg)' },
          '70%': { transform: 'scale(0.95) rotate(-1deg)' },
          '100%': { opacity: '1', transform: 'scale(1) rotate(0)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 18px rgba(22,255,122,0.35)' },
          '50%': { boxShadow: '0 0 40px rgba(22,255,122,0.7)' },
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
