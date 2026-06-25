/**
 * Mini-game registry — the single map the engine consults.
 *
 * All six engines are implemented; the engine asks the registry for a game by
 * id and treats them uniformly. Adding a seventh is one entry here + one folder.
 */

import type { AnswerValue, Difficulty, MiniGameId } from '../types/match.ts';
import type { Rng } from '../lib/rng.ts';
import type { MiniGame } from './types.ts';
import { multipleChoiceGame } from './multiple_choice/index.tsx';
import { higherLowerGame } from './higher_lower/index.tsx';
import { trueFalseGame } from './true_false/index.tsx';
import { oddOneOutGame } from './odd_one_out/index.tsx';
import { guessTheYearGame } from './guess_the_year/index.tsx';
import { careerPathGame } from './career_path/index.tsx';

const REGISTRY: Record<MiniGameId, MiniGame<unknown, AnswerValue>> = {
  multiple_choice: multipleChoiceGame as MiniGame<unknown, AnswerValue>,
  higher_lower: higherLowerGame as MiniGame<unknown, AnswerValue>,
  true_false: trueFalseGame as MiniGame<unknown, AnswerValue>,
  odd_one_out: oddOneOutGame as MiniGame<unknown, AnswerValue>,
  guess_the_year: guessTheYearGame as MiniGame<unknown, AnswerValue>,
  career_path: careerPathGame as MiniGame<unknown, AnswerValue>,
};

export function getMiniGame(id: MiniGameId): MiniGame<unknown, AnswerValue> {
  return REGISTRY[id];
}

/** Build the per-match sequence of mini-games (length QUESTIONS_PER_MATCH). */
export function buildSequence(
  ids: readonly MiniGameId[],
  count: number,
  rng: Rng,
): MiniGameId[] {
  const seq: MiniGameId[] = [];
  let bag: MiniGameId[] = [];
  for (let i = 0; i < count; i++) {
    if (bag.length === 0) bag = rng.shuffle(ids);
    seq.push(bag.pop() as MiniGameId);
  }
  return seq;
}

export type { Difficulty };
