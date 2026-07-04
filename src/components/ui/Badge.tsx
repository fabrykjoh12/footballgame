import type { ReactNode } from 'react';
import type { Difficulty } from '../../types/game';

type Tone = 'pitch' | 'gold' | 'white' | 'danger' | 'muted' | 'blue' | 'royal';

const TONES: Record<Tone, string> = {
  pitch: 'text-pitch bg-pitch/10 border-pitch/20',
  gold: 'text-gold bg-gold/10 border-gold/20',
  white: 'text-ink-600 bg-black/[0.04] border-black/10',
  danger: 'text-danger bg-danger/10 border-danger/20',
  muted: 'text-ink-500 bg-black/[0.03] border-black/[0.08]',
  blue: 'text-sky-700 bg-sky-500/10 border-sky-500/20',
  royal: 'text-royal bg-royal/10 border-royal/20',
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
