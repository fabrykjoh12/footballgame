import type { ReactNode } from 'react';
import type { Difficulty } from '../../types/game';

type Tone = 'pitch' | 'gold' | 'white' | 'danger' | 'muted' | 'blue';

const TONES: Record<Tone, string> = {
  pitch: 'bg-pitch/15 text-pitch border-pitch/30',
  gold: 'bg-gold/15 text-gold border-gold/30',
  white: 'bg-white/10 text-white border-white/20',
  danger: 'bg-danger/15 text-danger border-danger/30',
  muted: 'bg-white/5 text-white/60 border-white/10',
  blue: 'bg-sky-400/15 text-sky-300 border-sky-400/30',
};

interface BadgeProps {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}

export function Badge({ children, tone = 'white', className = '' }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1',
        'text-[11px] font-semibold uppercase tracking-wide',
        TONES[tone],
        className,
      ].join(' ')}
    >
      {children}
    </span>
  );
}

const DIFFICULTY_TONE: Record<Difficulty, Tone> = {
  easy: 'pitch',
  medium: 'blue',
  hard: 'gold',
  nightmare: 'danger',
};

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  return <Badge tone={DIFFICULTY_TONE[difficulty]}>{difficulty}</Badge>;
}
