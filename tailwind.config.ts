import type { Config } from 'tailwindcss';

/**
 * Dark-first theme with a vibrant neon-green accent.
 * Team-specific colors are injected at runtime as CSS variables (see ui/theme),
 * so the palette here is the app shell, not per-match identity.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        pitch: {
          950: '#04140c',
          900: '#061a10',
          800: '#0a2418',
        },
        neon: {
          DEFAULT: '#39ff7a',
          soft: '#7dffab',
          dim: '#1f9e4d',
        },
        ink: {
          DEFAULT: '#e8fff1',
          muted: '#9fc7af',
        },
        // Bound at runtime from the active player's team theme.
        team: {
          home: 'rgb(var(--team-home) / <alpha-value>)',
          away: 'rgb(var(--team-away) / <alpha-value>)',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'pitch-glow':
          'radial-gradient(circle at 50% 0%, rgba(57,255,122,0.18), transparent 60%)',
        'neon-grad': 'linear-gradient(135deg, #39ff7a 0%, #1f9e4d 100%)',
      },
      boxShadow: {
        neon: '0 0 24px rgba(57,255,122,0.35)',
      },
      keyframes: {
        'score-pop': {
          '0%': { transform: 'scale(1)' },
          '40%': { transform: 'scale(1.35)' },
          '100%': { transform: 'scale(1)' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'score-pop': 'score-pop 0.45s ease-out',
        'fade-up': 'fade-up 0.3s ease-out',
      },
    },
  },
  plugins: [],
} satisfies Config;
