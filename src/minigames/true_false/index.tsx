/**
 * True / False — rapid-fire binary call under a tight clock.
 * Answer value is the player's verdict as a boolean.
 */

import { useState } from 'react';
import type { Difficulty } from '../../types/match.ts';
import type { Rng } from '../../lib/rng.ts';
import {
  outcomeFromCorrectness,
  type MiniGame,
  type MiniGameProps,
} from '../types.ts';
import { TRUE_FALSE_BANK } from '../data/trueFalseBank.ts';

export interface TrueFalsePayload {
  text: string;
  isTrue: boolean;
}

const TIME_LIMIT_SEC = 7;

function generate(rng: Rng, _difficulty: Difficulty): TrueFalsePayload {
  const s = rng.pick(TRUE_FALSE_BANK);
  return { text: s.text, isTrue: s.isTrue };
}

function score(payload: TrueFalsePayload, answer: boolean, elapsedMs: number) {
  return outcomeFromCorrectness(answer === payload.isTrue, elapsedMs, TIME_LIMIT_SEC);
}

function cpuAnswer(payload: TrueFalsePayload, skill: number, rng: Rng): boolean {
  return rng.chance(skill) ? payload.isTrue : !payload.isTrue;
}

function Verdict({
  label,
  value,
  reveal,
  isCorrect,
  chosen,
  onPick,
}: {
  label: string;
  value: boolean;
  reveal: boolean;
  isCorrect: boolean;
  chosen: boolean | null;
  onPick: () => void;
}) {
  const picked = chosen === value;
  return (
    <button
      type="button"
      disabled={reveal}
      onClick={onPick}
      className={[
        'flex-1 rounded-xl border px-4 py-6 font-display text-lg font-bold uppercase tracking-wide transition',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-neon',
        reveal && isCorrect
          ? 'border-neon bg-neon/10 text-neon'
          : picked
            ? 'border-red-400 bg-red-400/10 text-red-200'
            : 'border-white/10 bg-white/5 hover:border-neon/60 hover:bg-white/10',
      ].join(' ')}
    >
      {label}
    </button>
  );
}

function TrueFalseComponent({
  payload,
  onAnswer,
  locked,
}: MiniGameProps<TrueFalsePayload, boolean>) {
  const [chosen, setChosen] = useState<boolean | null>(null);
  const reveal = locked || chosen !== null;

  const pick = (verdict: boolean) => {
    if (reveal) return;
    setChosen(verdict);
    onAnswer(verdict);
  };

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-balance text-center font-display text-xl font-semibold sm:text-2xl">
        {payload.text}
      </h2>
      <div className="flex gap-3">
        <Verdict
          label="True"
          value={true}
          reveal={reveal}
          isCorrect={payload.isTrue === true}
          chosen={chosen}
          onPick={() => pick(true)}
        />
        <Verdict
          label="False"
          value={false}
          reveal={reveal}
          isCorrect={payload.isTrue === false}
          chosen={chosen}
          onPick={() => pick(false)}
        />
      </div>
    </div>
  );
}

export const trueFalseGame: MiniGame<TrueFalsePayload, boolean> = {
  id: 'true_false',
  title: 'True or False',
  timeLimitSec: TIME_LIMIT_SEC,
  generate,
  score,
  cpuAnswer,
  Component: TrueFalseComponent,
};
