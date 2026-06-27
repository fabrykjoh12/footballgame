/**
 * Singleplayer arcade modes — Survival, Time Attack and Gauntlet.
 *
 * These are a self-contained layer on top of the question bank + the pure
 * scoring engine; they do NOT use the 1v1 `matchEngine` (which is built around a
 * fixed-length two-player Room). Question selection and answer grading live here
 * as pure functions so they can be unit-tested; the React `SoloGame` component
 * drives the timers and renders the shared `QuestionCard`.
 */

import type { Difficulty, Question, QuestionType } from '../types/game';
import { QUESTIONS } from '../data/questions';
import { shuffle } from './questionPicker';
import {
  GUESS_NUMBER_CORRECT_WITHIN,
  guessAccuracy,
  calculateQuestionPoints,
} from './scoring';
import type { PointsBreakdown } from '../types/game';

export type SoloMode = 'survival' | 'time_attack' | 'gauntlet';

export interface SoloModeConfig {
  id: SoloMode;
  label: string;
  description: string;
  /** Emoji marker (house rule: no crests/photos). */
  icon: string;
  /** Per-question time budget in ms. */
  perQuestionMs: number;
  /** Survival: lives before the run ends (1 = one mistake ends it). */
  lives?: number;
  /** Time Attack: total clock for the whole run, in ms. */
  totalTimeMs?: number;
  /** Gauntlet: fixed number of questions. */
  length?: number;
}

export const SOLO_MODES: Record<SoloMode, SoloModeConfig> = {
  survival: {
    id: 'survival',
    label: 'Survival',
    description: 'One life. Keep answering correctly — the questions get harder as you go. How long can you last?',
    icon: '❤️',
    perQuestionMs: 13000,
    lives: 1,
  },
  time_attack: {
    id: 'time_attack',
    label: 'Time Attack',
    description: '60 seconds on the clock. Bank as many points as you can — wrong answers cost you nothing but time.',
    icon: '⏱️',
    perQuestionMs: 12000,
    totalTimeMs: 60000,
  },
  gauntlet: {
    id: 'gauntlet',
    label: 'The Gauntlet',
    description: 'One question from every mini-game, difficulty climbing from easy to nightmare. A true test of range.',
    icon: '🧗',
    perQuestionMs: 14000,
    length: 10,
  },
};

export const SOLO_MODE_LIST: SoloModeConfig[] = [
  SOLO_MODES.survival,
  SOLO_MODES.time_attack,
  SOLO_MODES.gauntlet,
];

/** All ten types in the canonical match order, for the Gauntlet. */
const GAUNTLET_TYPES: QuestionType[] = [
  'who_am_i',
  'career_path',
  'higher_lower',
  'club_country',
  'guess_year',
  'transfer_fee',
  'pitch_position',
  'odd_one_out',
  'spot_the_lie',
  'guess_the_number',
];

/** Difficulty ramp for the 10-question Gauntlet (easy → nightmare). */
const GAUNTLET_RAMP: Difficulty[] = [
  'easy',
  'easy',
  'medium',
  'medium',
  'medium',
  'hard',
  'hard',
  'hard',
  'nightmare',
  'nightmare',
];

/* ------------------------------------------------------------------ */
/* Question selection (pure)                                           */
/* ------------------------------------------------------------------ */

function pickOne(
  candidates: Question[],
  used: Set<string>,
  recent: readonly string[] | undefined,
  rng: () => number,
): Question | null {
  const fresh = candidates.filter((q) => !used.has(q.id));
  if (fresh.length === 0) return null;
  // Prefer questions the player hasn't seen recently; when all are recent,
  // fall back to the stalest one (oldest in `recent`) rather than at random.
  if (recent && recent.length) {
    const rank = new Map(recent.map((id, i) => [id, i] as const));
    const unseen = fresh.filter((q) => !rank.has(q.id));
    if (unseen.length) return shuffle(unseen, rng)[0];
    return [...fresh].sort((a, b) => rank.get(a.id)! - rank.get(b.id)!)[0];
  }
  return shuffle(fresh, rng)[0];
}

/**
 * Build the ordered question list for a solo run.
 * - Gauntlet: exactly one per type, difficulty climbing easy→nightmare.
 * - Survival: a long list banded by difficulty (easy first, nightmare last) so
 *   it gets harder the longer you last.
 * - Time Attack: a quickfire shuffle that leans on easier questions.
 */
export function pickSoloQuestions(
  mode: SoloMode,
  pool: Question[] = QUESTIONS,
  recent?: readonly string[],
  rng: () => number = Math.random,
): Question[] {
  const used = new Set<string>();
  const take = (q: Question | null) => {
    if (q) used.add(q.id);
    return q;
  };

  if (mode === 'gauntlet') {
    const out: Question[] = [];
    GAUNTLET_TYPES.forEach((type, i) => {
      const target = GAUNTLET_RAMP[i];
      const byTypeDiff = pool.filter((q) => q.type === type && q.difficulty === target);
      const byType = pool.filter((q) => q.type === type);
      const q = take(pickOne(byTypeDiff, used, recent, rng)) ?? take(pickOne(byType, used, recent, rng));
      if (q) out.push(q);
    });
    return out;
  }

  if (mode === 'survival') {
    const bands: Difficulty[] = ['easy', 'medium', 'hard', 'nightmare'];
    const out: Question[] = [];
    for (const band of bands) {
      const inBand = shuffle(pool.filter((q) => q.difficulty === band), rng);
      // Keep the climb meaningful but bounded; the run ends on the first miss.
      out.push(...inBand.slice(0, band === 'nightmare' ? 30 : 18));
    }
    return out;
  }

  // time_attack: quickfire — favour easy/medium so the clock is the pressure.
  const quick = shuffle(pool.filter((q) => q.difficulty === 'easy' || q.difficulty === 'medium'), rng);
  const rest = shuffle(pool.filter((q) => q.difficulty === 'hard' || q.difficulty === 'nightmare'), rng);
  return [...quick, ...rest].slice(0, 80);
}

/* ------------------------------------------------------------------ */
/* Answer grading (pure)                                               */
/* ------------------------------------------------------------------ */

export interface SoloGrade {
  isCorrect: boolean;
  /** Closeness factor for guess_the_number (0–1); undefined otherwise. */
  accuracy?: number;
  breakdown: PointsBreakdown;
  newStreak: number;
}

/**
 * Grade one solo answer with the shared scoring rules. `selectedAnswer` is null
 * for a timeout (always incorrect, zero points, streak reset).
 */
export function gradeSoloAnswer(
  question: Question,
  selectedAnswer: string | null,
  clueStage: number,
  timeTakenMs: number,
  totalTimeMs: number,
  prevStreak: number,
): SoloGrade {
  if (selectedAnswer == null) {
    return { isCorrect: false, breakdown: { base: 0, speedBonus: 0, streakBonus: 0, total: 0 }, newStreak: 0 };
  }

  if (question.type === 'guess_the_number') {
    const accuracy = guessAccuracy(Number(selectedAnswer), Number(question.correctAnswer));
    const isCorrect = accuracy >= 1 - GUESS_NUMBER_CORRECT_WITHIN;
    const newStreak = isCorrect ? prevStreak + 1 : 0;
    const breakdown = calculateQuestionPoints({
      type: question.type,
      isCorrect,
      clueStage,
      timeTakenMs,
      totalTimeMs,
      newStreak,
      accuracy,
    });
    return { isCorrect, accuracy, breakdown, newStreak };
  }

  const isCorrect = selectedAnswer === question.correctAnswer;
  const newStreak = isCorrect ? prevStreak + 1 : 0;
  const breakdown = calculateQuestionPoints({
    type: question.type,
    isCorrect,
    clueStage,
    timeTakenMs,
    totalTimeMs,
    newStreak,
  });
  return { isCorrect, breakdown, newStreak };
}

/** Clue stage visible at answer time for who_am_i (a new clue every 5s). */
export function clueStageForElapsed(question: Question, elapsedMs: number): number {
  if (question.type !== 'who_am_i') return 0;
  return Math.min(Math.floor(elapsedMs / 5000), question.clues.length - 1);
}
