/**
 * Mini-game registry — the single map the engine consults.
 *
 * Only Multiple Choice is implemented in this phase; the other five ids fall
 * back to it so the full 10-question loop is playable end-to-end today. Phase 2
 * replaces each fallback with its real engine — and the match loop needs zero
 * changes when it does.
 */

import type { AnswerValue, Difficulty, MiniGameId } from '../types/match.ts';
import type { Rng } from '../lib/rng.ts';
import type { MiniGame } from './types.ts';
import { multipleChoiceGame } from './multiple_choice/index.tsx';

const IMPLEMENTED: Partial<Record<MiniGameId, MiniGame<unknown, AnswerValue>>> = {
  multiple_choice: multipleChoiceGame as MiniGame<unknown, AnswerValue>,
};

export function getMiniGame(id: MiniGameId): MiniGame<unknown, AnswerValue> {
  // Fallback keeps the loop playable until every engine exists (Phase 2).
  return IMPLEMENTED[id] ?? (multipleChoiceGame as MiniGame<unknown, AnswerValue>);
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
