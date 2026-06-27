/**
 * Ball Knowledge — scoring & game-rule engine.
 *
 * All point/goal math lives here as pure functions so the rules can be
 * tuned and unit-tested without touching the UI. The React layer and the
 * game services import from here; they never hard-code scoring numbers.
 *
 * Design goals (from the brief): speed matters, but knowledge matters more.
 */

import type {
  GameEventKind,
  PointsBreakdown,
  QuestionType,
} from '../types/game';

/* ------------------------------------------------------------------ */
/* Tunable constants                                                   */
/* ------------------------------------------------------------------ */

/** Base points per question type (who_am_i is overridden by clue stage). */
export const BASE_POINTS: Record<QuestionType, number> = {
  who_am_i: 1000,
  career_path: 800,
  higher_lower: 700,
  club_country: 700,
  guess_year: 700,
  transfer_fee: 700,
  pitch_position: 700,
  odd_one_out: 700,
  spot_the_lie: 700,
  guess_the_number: 800,
};

/**
 * "WHO AM I?" base points by clue stage (0 = only first clue visible).
 * The earlier you answer, the more it's worth. Clamped to the last value.
 */
export const WHO_AM_I_CLUE_POINTS = [1000, 700, 400] as const;

/** Maximum speed bonus per question type (scaled by remaining time). */
export const MAX_SPEED_BONUS: Record<QuestionType, number> = {
  who_am_i: 200,
  career_path: 200,
  higher_lower: 300,
  club_country: 300,
  guess_year: 300,
  transfer_fee: 300,
  pitch_position: 300,
  odd_one_out: 300,
  spot_the_lie: 300,
  guess_the_number: 300,
};

/** Goal conversion: every 2500 points = 1 goal, capped at 5. */
export const POINTS_PER_GOAL = 2500;
export const MAX_GOALS = 5;

/** A correct answer under this many ms triggers a "Counterattack!". */
export const COUNTERATTACK_MS = 3000;

/**
 * For "Guess the Number", a guess within this fraction of the true value
 * counts as "correct" for streaks / stats (points themselves scale smoothly).
 */
export const GUESS_NUMBER_CORRECT_WITHIN = 0.2;

/**
 * Closeness for a numeric guess vs the true value, on a 0–1 scale:
 * exact → 1, 10% off → 0.9, 90% off → 0.1, ≥100% off → 0. Linear in the
 * relative error. Drives scaled (partial-credit) points for Guess the Number.
 */
export function guessAccuracy(guess: number, actual: number): number {
  if (!Number.isFinite(guess) || !Number.isFinite(actual)) return 0;
  if (actual === 0) return guess === 0 ? 1 : 0;
  const error = Math.abs(guess - actual) / Math.abs(actual);
  return Math.max(0, Math.min(1, 1 - error));
}

/* ------------------------------------------------------------------ */
/* Pure scoring functions                                              */
/* ------------------------------------------------------------------ */

/** Base points for a question, accounting for who_am_i clue stage. */
export function calculateBasePoints(
  type: QuestionType,
  clueStage = 0,
): number {
  if (type === 'who_am_i') {
    const idx = Math.min(
      Math.max(clueStage, 0),
      WHO_AM_I_CLUE_POINTS.length - 1,
    );
    return WHO_AM_I_CLUE_POINTS[idx];
  }
  return BASE_POINTS[type];
}

/**
 * Speed bonus scales linearly with the fraction of time remaining when the
 * answer was submitted. Answer instantly → full bonus; answer at the buzzer
 * → ~0. Always non-negative.
 */
export function calculateSpeedBonus(
  type: QuestionType,
  timeTakenMs: number,
  totalTimeMs: number,
): number {
  if (totalTimeMs <= 0) return 0;
  const remaining = Math.max(0, totalTimeMs - timeTakenMs);
  const fraction = Math.min(1, remaining / totalTimeMs);
  return Math.round(MAX_SPEED_BONUS[type] * fraction);
}

/**
 * Streak bonus based on the player's NEW streak (after this answer):
 * 2 → +50, 3 → +100, 4+ → +150. Below 2 → 0.
 */
export function calculateStreakBonus(newStreak: number): number {
  if (newStreak >= 4) return 150;
  if (newStreak === 3) return 100;
  if (newStreak === 2) return 50;
  return 0;
}

export interface QuestionPointsInput {
  type: QuestionType;
  isCorrect: boolean;
  /** who_am_i clue stage visible at answer time (0-based). */
  clueStage: number;
  timeTakenMs: number;
  totalTimeMs: number;
  /** Streak value AFTER applying this answer (i.e. correct → prev+1). */
  newStreak: number;
  /**
   * Partial-credit factor (0–1) for closeness-scored types like Guess the
   * Number. When provided, base + speed scale by it so a near-miss still earns
   * a share of the pot. Omit for normal all-or-nothing questions.
   */
  accuracy?: number;
}

/**
 * Full breakdown for one answer. Normal questions are all-or-nothing; when an
 * `accuracy` factor is supplied (Guess the Number) the base and speed bonus
 * scale smoothly with closeness, so being 10% off still pays ~90% of the pot.
 */
export function calculateQuestionPoints(
  input: QuestionPointsInput,
): PointsBreakdown {
  // Closeness-scored path (partial credit).
  if (input.accuracy !== undefined) {
    const factor = Math.max(0, Math.min(1, input.accuracy));
    if (factor <= 0) {
      return { base: 0, speedBonus: 0, streakBonus: 0, total: 0 };
    }
    const base = Math.round(
      calculateBasePoints(input.type, input.clueStage) * factor,
    );
    const speedBonus = Math.round(
      calculateSpeedBonus(input.type, input.timeTakenMs, input.totalTimeMs) *
        factor,
    );
    // Streak/streak-bonus only when the guess was close enough to count.
    const streakBonus = input.isCorrect
      ? calculateStreakBonus(input.newStreak)
      : 0;
    return { base, speedBonus, streakBonus, total: base + speedBonus + streakBonus };
  }

  if (!input.isCorrect) {
    return { base: 0, speedBonus: 0, streakBonus: 0, total: 0 };
  }
  const base = calculateBasePoints(input.type, input.clueStage);
  const speedBonus = calculateSpeedBonus(
    input.type,
    input.timeTakenMs,
    input.totalTimeMs,
  );
  const streakBonus = calculateStreakBonus(input.newStreak);
  return {
    base,
    speedBonus,
    streakBonus,
    total: base + speedBonus + streakBonus,
  };
}

/** Convert a running point total into football goals (0–5). */
export function calculateGoalsFromPoints(points: number): number {
  if (points <= 0) return 0;
  return Math.min(MAX_GOALS, Math.floor(points / POINTS_PER_GOAL));
}

/* ------------------------------------------------------------------ */
/* Football-flavoured event labels                                     */
/* ------------------------------------------------------------------ */

/** Display label for a live football event (drives the GOAL! overlay). */
export function getFootballEventLabel(kind: GameEventKind): string {
  switch (kind) {
    case 'goal':
      return 'GOAL!';
    case 'equalizer':
      return 'Equalizer!';
    case 'late_winner':
      return 'Late Winner!';
    case 'hat_trick':
      return 'Hat-trick of correct answers!';
    case 'counterattack':
      return 'Counterattack!';
  }
}

/**
 * Events that depend only on a single player's own answer (not the
 * opponent's state): scoring a goal, hat-trick streaks, fast counterattacks.
 * Cross-player events (equalizer / late winner) are resolved by the game
 * engine, which has both players' before/after goal counts.
 */
export function getSoloPlayerEvents(params: {
  isCorrect: boolean;
  scoredGoal: boolean;
  newStreak: number;
  timeTakenMs: number;
}): GameEventKind[] {
  const events: GameEventKind[] = [];
  if (params.scoredGoal) events.push('goal');
  if (params.isCorrect && params.newStreak > 0 && params.newStreak % 3 === 0) {
    events.push('hat_trick');
  }
  if (params.isCorrect && params.timeTakenMs <= COUNTERATTACK_MS) {
    events.push('counterattack');
  }
  return events;
}

/** Accuracy percentage helper (0–100, rounded). */
export function accuracyPercent(correct: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((correct / total) * 100);
}
