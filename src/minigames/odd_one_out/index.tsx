/**
 * Odd One Out — pick the item that doesn't belong with the others.
 * Answer value is the chosen option index.
 */

import { useState } from 'react';
import type { Difficulty } from '../../types/match.ts';
import type { Rng } from '../../lib/rng.ts';
import {
  outcomeFromCorrectness,
  type MiniGame,
  type MiniGameProps,
} from '../types.ts';
import { ODD_ONE_OUT_BANK } from '../data/oddOneOutBank.ts';

export interface OddOneOutPayload {
  options: string[];
  /** Index of the odd one out within `options`. */
  answerIndex: number;
  theme: string;
  reason: string;
}

const TIME_LIMIT_SEC = 12;

function generate(rng: Rng, _difficulty: Difficulty): OddOneOutPayload {
  const group = rng.pick(ODD_ONE_OUT_BANK);
  const options = rng.shuffle([...group.members, group.odd]);
  return {
    options,
    answerIndex: options.indexOf(group.odd),
    theme: group.theme,
    reason: group.reason,
  };
}

function score(payload: OddOneOutPayload, answer: number, elapsedMs: number) {
  return outcomeFromCorrectness(answer === payload.answerIndex, elapsedMs, TIME_LIMIT_SEC);
}

function cpuAnswer(payload: OddOneOutPayload, skill: number, rng: Rng): number {
  if (rng.chance(skill)) return payload.answerIndex;
  return rng.int(0, payload.options.length - 1);
}

function OddOneOutComponent({
  payload,
  onAnswer,
  locked,
}: MiniGameProps<OddOneOutPayload, number>) {
  const [chosen, setChosen] = useState<number | null>(null);
  const reveal = locked || chosen !== null;

  const pick = (i: number) => {
    if (reveal) return;
    setChosen(i);
    onAnswer(i);
  };

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-center font-display text-lg font-semibold sm:text-xl">
        Which one doesn’t belong?
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {payload.options.map((opt, i) => {
          const isOdd = i === payload.answerIndex;
          const picked = chosen === i;
          return (
            <button
              key={opt}
              type="button"
              disabled={reveal}
              onClick={() => pick(i)}
              className={[
                'rounded-xl border px-4 py-3.5 text-center text-sm font-semibold transition',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-neon',
                reveal && isOdd
                  ? 'border-neon bg-neon/10 text-neon'
                  : picked
                    ? 'border-red-400 bg-red-400/10 text-red-200'
                    : 'border-white/10 bg-white/5 hover:border-neon/60 hover:bg-white/10',
              ].join(' ')}
            >
              {opt}
            </button>
          );
        })}
      </div>
      {reveal && (
        <p className="animate-fade-up text-center text-xs text-ink-muted">
          {payload.theme} — {payload.reason}
        </p>
      )}
    </div>
  );
}

export const oddOneOutGame: MiniGame<OddOneOutPayload, number> = {
  id: 'odd_one_out',
  title: 'Odd One Out',
  timeLimitSec: TIME_LIMIT_SEC,
  generate,
  score,
  cpuAnswer,
  Component: OddOneOutComponent,
};
