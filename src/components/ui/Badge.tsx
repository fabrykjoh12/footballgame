import type { ReactNode } from 'react';
import type { Difficulty } from '../../types/game';

type Tone = 'pitch' | 'gold' | 'white' | 'danger' | 'muted' | 'blue' | 'royal';

const TONES: Record<Tone, string> = {
  pitch: 'text-pitch bg-pitch/15 border-pitch/25',
  gold: 'text-gold bg-gold/15 border-gold/25',
  white: 'text-white/70 bg-white/[0.06] border-white/10',
  danger: 'text-danger bg-danger/15 border-danger/25',
  muted: 'text-white/55 bg-white/[0.04] border-white/[0.08]',
  blue: 'text-sky-300 bg-sky-500/15 border-sky-400/25',
  royal: 'text-royal bg-royal/15 border-royal/25',
};

interface BadgeProps {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}

/** A small pill chip: soft tinted fill, thin border. */
export function Badge({ children, tone = 'white', className = '' }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5',
        'text-[11px] font-semibold',
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
