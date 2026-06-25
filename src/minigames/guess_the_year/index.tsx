/**
 * Guess the Year — stepper/slider input scored by closeness.
 *
 * Unlike the other games this uses custom scoring: an exact answer is a
 * worldie, a near miss is still a credible chance, and being far off misses.
 * Answer value is the chosen year (number).
 */

import { useState } from 'react';
import type { AnswerOutcome, Difficulty } from '../../types/match.ts';
import type { Rng } from '../../lib/rng.ts';
import type { MiniGame, MiniGameProps } from '../types.ts';
import {
  GUESS_THE_YEAR_BANK,
  YEAR_MAX,
  YEAR_MIN,
} from '../data/guessTheYearBank.ts';

export interface GuessTheYearPayload {
  prompt: string;
  year: number;
  min: number;
  max: number;
}

const TIME_LIMIT_SEC = 14;
/** Within this many years counts as "correct" (a scoring chance). */
export const YEAR_TOLERANCE = 3;

function generate(rng: Rng, _difficulty: Difficulty): GuessTheYearPayload {
  const event = rng.pick(GUESS_THE_YEAR_BANK);
  return { prompt: event.prompt, year: event.year, min: YEAR_MIN, max: YEAR_MAX };
}

/** Closeness-based outcome: distance and speed both shape quality. */
export function scoreGuessTheYear(
  payload: GuessTheYearPayload,
  answer: number,
  elapsedMs: number,
): AnswerOutcome {
  const distance = Math.abs(answer - payload.year);
  const correct = distance <= YEAR_TOLERANCE;
  if (!correct) return { correct: false, quality: 0, elapsedMs };

  // distance 0 → 1.0, distance == tolerance → ~0.45.
  const closeness = 1 - distance / (YEAR_TOLERANCE + 1);
  const limitMs = TIME_LIMIT_SEC * 1000;
  const speed = Math.max(0, Math.min(1, 1 - elapsedMs / limitMs));
  const quality = Math.max(0.45, Math.min(1, 0.45 + closeness * 0.4 + speed * 0.15));
  return { correct: true, quality, elapsedMs };
}

function cpuAnswer(payload: GuessTheYearPayload, skill: number, rng: Rng): number {
  // Higher skill → tighter spread around the true year.
  const spread = Math.round((1 - skill) * 12) + 1;
  const offset = rng.int(-spread, spread);
  return Math.max(payload.min, Math.min(payload.max, payload.year + offset));
}

function GuessTheYearComponent({
  payload,
  onAnswer,
  locked,
}: MiniGameProps<GuessTheYearPayload, number>) {
  const [value, setValue] = useState(Math.round((payload.min + payload.max) / 2));
  const [submitted, setSubmitted] = useState(false);
  const reveal = locked || submitted;

  const submit = () => {
    if (reveal) return;
    setSubmitted(true);
    onAnswer(value);
  };

  const distance = Math.abs(value - payload.year);

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-balance text-center font-display text-lg font-semibold sm:text-xl">
        In which year? {payload.prompt}
      </h2>

      <div className="flex flex-col items-center gap-3">
        <div className="font-display text-5xl font-bold tabular-nums text-neon">
          {value}
        </div>
        <input
          type="range"
          min={payload.min}
          max={payload.max}
          value={value}
          disabled={reveal}
          onChange={(e) => setValue(Number(e.target.value))}
          aria-label="Year"
          className="w-full accent-neon"
        />
        <div className="flex w-full justify-between text-xs text-ink-muted">
          <span>{payload.min}</span>
          <span>{payload.max}</span>
        </div>
      </div>

      {reveal ? (
        <p className="animate-fade-up text-center text-sm">
          The answer was{' '}
          <span className="font-display font-bold text-neon">{payload.year}</span>
          {distance === 0
            ? ' — spot on!'
            : ` — you were ${distance} year${distance === 1 ? '' : 's'} off.`}
        </p>
      ) : (
        <button
          type="button"
          onClick={submit}
          className="rounded-xl bg-neon-grad px-4 py-3 font-display font-bold text-pitch-950 shadow-neon transition hover:brightness-110"
        >
          Lock it in
        </button>
      )}
    </div>
  );
}

export const guessTheYearGame: MiniGame<GuessTheYearPayload, number> = {
  id: 'guess_the_year',
  title: 'Guess the Year',
  timeLimitSec: TIME_LIMIT_SEC,
  generate,
  score: scoreGuessTheYear,
  cpuAnswer,
  Component: GuessTheYearComponent,
};
