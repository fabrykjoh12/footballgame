/**
 * Multiple Choice — the reference mini-game implementing the MiniGame contract.
 * Serves as the template every other mini-game follows.
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
  MULTIPLE_CHOICE_BANK,
  type MultipleChoiceQuestion,
} from '../data/multipleChoiceBank.ts';

export interface MultipleChoicePayload {
  prompt: string;
  /** Options shuffled for display. */
  options: string[];
  /** Index into the shuffled `options` that is correct. */
  answerIndex: number;
}

const TIME_LIMIT_SEC = 12;

function generate(rng: Rng, _difficulty: Difficulty): MultipleChoicePayload {
  const q: MultipleChoiceQuestion = rng.pick(MULTIPLE_CHOICE_BANK);
  const correct = q.options[q.answerIndex];
  const shuffled = rng.shuffle(q.options);
  return {
    prompt: q.prompt,
    options: shuffled,
    answerIndex: shuffled.indexOf(correct as string),
  };
}

function score(
  payload: MultipleChoicePayload,
  answer: number,
  elapsedMs: number,
) {
  return outcomeFromCorrectness(
    answer === payload.answerIndex,
    elapsedMs,
    TIME_LIMIT_SEC,
  );
}

function cpuAnswer(
  payload: MultipleChoicePayload,
  skill: number,
  rng: Rng,
): number {
  // With probability `skill`, pick correctly; otherwise pick a random option.
  if (rng.chance(skill)) return payload.answerIndex;
  return rng.int(0, payload.options.length - 1);
}

function MultipleChoiceComponent({
  payload,
  onAnswer,
  locked,
}: MiniGameProps<MultipleChoicePayload, number>) {
  const [chosen, setChosen] = useState<number | null>(null);

  const pick = (i: number) => {
    if (locked || chosen !== null) return;
    setChosen(i);
    onAnswer(i);
  };

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-balance text-xl font-display font-semibold text-ink sm:text-2xl">
        {payload.prompt}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {payload.options.map((opt, i) => {
          const isChosen = chosen === i;
          const reveal = locked || chosen !== null;
          const isCorrect = i === payload.answerIndex;
          return (
            <button
              key={opt}
              type="button"
              disabled={reveal}
              onClick={() => pick(i)}
              className={[
                'rounded-xl border px-4 py-3 text-left text-sm font-medium transition',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-neon',
                reveal && isCorrect
                  ? 'border-neon bg-neon/10 text-neon'
                  : isChosen
                    ? 'border-red-400 bg-red-400/10 text-red-200'
                    : 'border-white/10 bg-white/5 text-ink hover:border-neon/60 hover:bg-white/10',
              ].join(' ')}
            >
              <span className="mr-2 text-ink-muted">
                {String.fromCharCode(65 + i)}.
              </span>
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export const multipleChoiceGame: MiniGame<MultipleChoicePayload, number> = {
  id: 'multiple_choice',
  title: 'Multiple Choice',
  timeLimitSec: TIME_LIMIT_SEC,
  generate,
  score,
  cpuAnswer,
  Component: MultipleChoiceComponent,
};
