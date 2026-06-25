/**
 * Career Path — a club sequence is shown as an SVG timeline; identify the
 * player from four options. Answer value is the chosen option index.
 */

import { useState } from 'react';
import type { Difficulty } from '../../types/match.ts';
import type { Rng } from '../../lib/rng.ts';
import {
  outcomeFromCorrectness,
  type MiniGame,
  type MiniGameProps,
} from '../types.ts';
import { CAREER_PATH_BANK } from '../data/careerPathBank.ts';

export interface CareerPathPayload {
  clubs: string[];
  options: string[];
  /** Index of the correct player within `options`. */
  answerIndex: number;
}

const TIME_LIMIT_SEC = 14;
const OPTION_COUNT = 4;

function generate(rng: Rng, _difficulty: Difficulty): CareerPathPayload {
  const target = rng.pick(CAREER_PATH_BANK);
  const distractors = rng
    .shuffle(CAREER_PATH_BANK.filter((p) => p.player !== target.player))
    .slice(0, OPTION_COUNT - 1)
    .map((p) => p.player);
  const options = rng.shuffle([target.player, ...distractors]);
  return {
    clubs: target.clubs,
    options,
    answerIndex: options.indexOf(target.player),
  };
}

function score(payload: CareerPathPayload, answer: number, elapsedMs: number) {
  return outcomeFromCorrectness(answer === payload.answerIndex, elapsedMs, TIME_LIMIT_SEC);
}

function cpuAnswer(payload: CareerPathPayload, skill: number, rng: Rng): number {
  if (rng.chance(skill)) return payload.answerIndex;
  return rng.int(0, payload.options.length - 1);
}

function CareerTimeline({ clubs }: { clubs: string[] }) {
  return (
    <ol className="flex flex-col gap-0" aria-label="Career path">
      {clubs.map((club, i) => (
        <li key={`${club}-${i}`} className="flex items-center gap-3">
          <div className="flex flex-col items-center">
            <span
              className="flex h-7 w-7 items-center justify-center rounded-full bg-neon/15 font-display text-xs font-bold text-neon ring-1 ring-neon/40"
              aria-hidden="true"
            >
              {i + 1}
            </span>
            {i < clubs.length - 1 && <span className="h-5 w-px bg-neon/30" />}
          </div>
          <span className="font-display text-base font-semibold">{club}</span>
        </li>
      ))}
    </ol>
  );
}

function CareerPathComponent({
  payload,
  onAnswer,
  locked,
}: MiniGameProps<CareerPathPayload, number>) {
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
        Whose career path is this?
      </h2>
      <div className="rounded-xl border border-white/10 bg-black/20 px-5 py-4">
        <CareerTimeline clubs={payload.clubs} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {payload.options.map((name, i) => {
          const isCorrect = i === payload.answerIndex;
          const picked = chosen === i;
          return (
            <button
              key={name}
              type="button"
              disabled={reveal}
              onClick={() => pick(i)}
              className={[
                'rounded-xl border px-4 py-3 text-left text-sm font-medium transition',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-neon',
                reveal && isCorrect
                  ? 'border-neon bg-neon/10 text-neon'
                  : picked
                    ? 'border-red-400 bg-red-400/10 text-red-200'
                    : 'border-white/10 bg-white/5 hover:border-neon/60 hover:bg-white/10',
              ].join(' ')}
            >
              {name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export const careerPathGame: MiniGame<CareerPathPayload, number> = {
  id: 'career_path',
  title: 'Career Path',
  timeLimitSec: TIME_LIMIT_SEC,
  generate,
  score,
  cpuAnswer,
  Component: CareerPathComponent,
};
