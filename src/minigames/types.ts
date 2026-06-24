/**
 * The mini-game contract.
 *
 * Every one of the six mini-games implements this same interface, so the match
 * engine treats them uniformly: ask the registry for a game, `generate` a
 * question, render its `Component` inside the shared shell, and read back an
 * `AnswerOutcome` via `score`. Adding a seventh game later is one folder + one
 * registry entry — zero engine changes.
 */

import type { ComponentType } from 'react';
import type {
  AnswerOutcome,
  AnswerValue,
  Difficulty,
  MiniGameId,
} from '../types/match.ts';
import type { Rng } from '../lib/rng.ts';

/** Props every mini-game component receives from the shell. */
export interface MiniGameProps<TPayload, TAnswer extends AnswerValue> {
  payload: TPayload;
  /** Submit the player's answer; the shell scores it and advances the match. */
  onAnswer: (answer: TAnswer) => void;
  /** True once the player (or timer) has resolved this question. */
  locked: boolean;
}

export interface MiniGame<TPayload = unknown, TAnswer extends AnswerValue = AnswerValue> {
  id: MiniGameId;
  title: string;
  /** Seconds the player has to answer this game type. */
  timeLimitSec: number;
  /** Build a fresh question. Pure given (rng, difficulty). */
  generate(rng: Rng, difficulty: Difficulty): TPayload;
  /** Score a player's answer against the payload. */
  score(payload: TPayload, answer: TAnswer, elapsedMs: number): AnswerOutcome;
  /** What the CPU would answer (used only as a fallback / hot-seat mode). */
  cpuAnswer(payload: TPayload, skill: number, rng: Rng): TAnswer;
  Component: ComponentType<MiniGameProps<TPayload, TAnswer>>;
}

/** Helper: turn correctness + elapsed time into a quality-scored outcome. */
export function outcomeFromCorrectness(
  correct: boolean,
  elapsedMs: number,
  timeLimitSec: number,
): AnswerOutcome {
  if (!correct) return { correct: false, quality: 0, elapsedMs };
  // Faster correct answers finish more clinically. Map remaining time → quality.
  const limitMs = timeLimitSec * 1000;
  const speed = Math.max(0, Math.min(1, 1 - elapsedMs / limitMs));
  // Floor quality so any correct answer is a credible chance.
  const quality = 0.45 + speed * 0.55;
  return { correct: true, quality: Math.min(1, quality), elapsedMs };
}
