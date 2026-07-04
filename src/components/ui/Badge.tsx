import type { ReactNode } from 'react';
import type { Difficulty } from '../../types/game';

type Tone = 'pitch' | 'gold' | 'white' | 'danger' | 'muted' | 'blue' | 'royal';

const TONES: Record<Tone, string> = {
  pitch: 'text-pitch border-pitch/40',
  gold: 'text-gold border-gold/40',
  white: 'text-bone border-bone/25',
  danger: 'text-danger border-danger/45',
  muted: 'text-bone-dim border-bone/15',
  blue: 'text-sky-300 border-sky-400/40',
  royal: 'text-royal border-royal/50',
};

interface BadgeProps {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}

/** A flat mono metadata chip: hairline border, spaced small caps, no fill. */
export function Badge({ children, tone = 'white', className = '' }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-sm border-[0.5px] px-2 py-0.5',
        'font-mono text-[10px] font-medium uppercase tracking-[0.12em]',
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
