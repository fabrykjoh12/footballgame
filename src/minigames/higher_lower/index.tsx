/**
 * Higher / Lower — pick which of two items ranks higher on a metric.
 * Answer value is the chosen side: 'left' or 'right'.
 */

import { useState } from 'react';
import type { Difficulty } from '../../types/match.ts';
import type { Rng } from '../../lib/rng.ts';
import {
  outcomeFromCorrectness,
  type MiniGame,
  type MiniGameProps,
} from '../types.ts';
import {
  HIGHER_LOWER_BANK,
  type HigherLowerItem,
} from '../data/higherLowerBank.ts';

export type HigherLowerAnswer = 'left' | 'right';

export interface HigherLowerPayload {
  metric: string;
  unit: string;
  left: HigherLowerItem;
  right: HigherLowerItem;
  /** Side with the strictly greater value. */
  higher: HigherLowerAnswer;
}

const TIME_LIMIT_SEC = 10;

function generate(rng: Rng, _difficulty: Difficulty): HigherLowerPayload {
  const category = rng.pick(HIGHER_LOWER_BANK);
  // Pick two items with distinct values so there's always a correct answer.
  let a = rng.pick(category.items);
  let b = rng.pick(category.items);
  let guard = 0;
  while (b.value === a.value && guard < 20) {
    b = rng.pick(category.items);
    guard++;
  }
  const [left, right] = rng.chance(0.5) ? [a, b] : [b, a];
  return {
    metric: category.metric,
    unit: category.unit,
    left,
    right,
    higher: left.value >= right.value ? 'left' : 'right',
  };
}

function score(
  payload: HigherLowerPayload,
  answer: HigherLowerAnswer,
  elapsedMs: number,
) {
  return outcomeFromCorrectness(answer === payload.higher, elapsedMs, TIME_LIMIT_SEC);
}

function cpuAnswer(
  payload: HigherLowerPayload,
  skill: number,
  rng: Rng,
): HigherLowerAnswer {
  if (rng.chance(skill)) return payload.higher;
  return payload.higher === 'left' ? 'right' : 'left';
}

function Card({
  item,
  unit,
  reveal,
  isHigher,
  onPick,
  disabled,
}: {
  item: HigherLowerItem;
  unit: string;
  reveal: boolean;
  isHigher: boolean;
  onPick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onPick}
      className={[
        'flex flex-1 flex-col items-center gap-2 rounded-xl border px-4 py-6 text-center transition',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-neon',
        reveal && isHigher
          ? 'border-neon bg-neon/10'
          : 'border-white/10 bg-white/5 hover:border-neon/60 hover:bg-white/10',
      ].join(' ')}
    >
      <span className="font-display text-base font-semibold">{item.label}</span>
      {reveal ? (
        <span className="font-display text-2xl font-bold text-neon tabular-nums">
          {item.value.toLocaleString()}
          <span className="ml-1 text-xs text-ink-muted">{unit}</span>
        </span>
      ) : (
        <span className="text-3xl text-ink-muted">?</span>
      )}
    </button>
  );
}

function HigherLowerComponent({
  payload,
  onAnswer,
  locked,
}: MiniGameProps<HigherLowerPayload, HigherLowerAnswer>) {
  const [chosen, setChosen] = useState<HigherLowerAnswer | null>(null);
  const reveal = locked || chosen !== null;

  const pick = (side: HigherLowerAnswer) => {
    if (reveal) return;
    setChosen(side);
    onAnswer(side);
  };

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-balance text-center font-display text-lg font-semibold sm:text-xl">
        Which is higher — {payload.metric}?
      </h2>
      <div className="flex items-stretch gap-3">
        <Card
          item={payload.left}
          unit={payload.unit}
          reveal={reveal}
          isHigher={payload.higher === 'left'}
          onPick={() => pick('left')}
          disabled={reveal}
        />
        <div className="flex items-center font-display text-sm text-ink-muted">vs</div>
        <Card
          item={payload.right}
          unit={payload.unit}
          reveal={reveal}
          isHigher={payload.higher === 'right'}
          onPick={() => pick('right')}
          disabled={reveal}
        />
      </div>
    </div>
  );
}

export const higherLowerGame: MiniGame<HigherLowerPayload, HigherLowerAnswer> = {
  id: 'higher_lower',
  title: 'Higher or Lower',
  timeLimitSec: TIME_LIMIT_SEC,
  generate,
  score,
  cpuAnswer,
  Component: HigherLowerComponent,
};
