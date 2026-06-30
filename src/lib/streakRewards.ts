/**
 * Daily-streak reward ladder.
 *
 * Turns the bare daily-streak number into a progression: each milestone unlocks
 * a cosmetic. The milestones reference cosmetic ids that are gated in
 * `cosmetics.ts` by the SAME day threshold, so the ladder and the catalogue
 * can't drift (a test cross-checks this). Pure + tested; the UI reads it to show
 * "X days to your next reward".
 *
 * The streak this ladder tracks is the canonical Daily streak
 * (`getDailyState().streak`), the same one the cosmetics rules read.
 */

import { getDailyState } from './dailyChallenge';

export type StreakRewardKind = 'accent' | 'pattern';

export interface StreakMilestone {
  /** Consecutive-day threshold. */
  days: number;
  kind: StreakRewardKind;
  /** Cosmetic id unlocked here — must match a `cosmetics.ts` rule at `days`. */
  cosmeticId: string;
  /** Human-facing reward label. */
  reward: string;
  emoji: string;
}

/** The ladder, ascending by day count. */
export const STREAK_MILESTONES: StreakMilestone[] = [
  { days: 3, kind: 'accent', cosmeticId: 'ember', reward: 'Streak Ember accent', emoji: '🔥' },
  { days: 7, kind: 'accent', cosmeticId: 'violet', reward: 'Devotee Violet accent', emoji: '💜' },
  { days: 14, kind: 'pattern', cosmeticId: 'diagonal', reward: 'Diagonal Cut pitch', emoji: '🎽' },
  { days: 30, kind: 'accent', cosmeticId: 'aurora', reward: 'Legend Aurora accent', emoji: '🌌' },
];

export interface LadderStep extends StreakMilestone {
  reached: boolean;
  isNext: boolean;
}

/** Milestones a given streak has reached (days <= streak). */
export function reachedMilestones(streak: number): StreakMilestone[] {
  return STREAK_MILESTONES.filter((m) => streak >= m.days);
}

/** The next milestone still to reach, or null once they're all done. */
export function nextMilestone(streak: number): StreakMilestone | null {
  return STREAK_MILESTONES.find((m) => m.days > streak) ?? null;
}

/** Days remaining until the next reward (0 when every milestone is reached). */
export function daysToNextReward(streak: number): number {
  const next = nextMilestone(streak);
  return next ? next.days - streak : 0;
}

/** Progress [0..1] from the previous milestone to the next (drives a meter). */
export function streakProgress(streak: number): number {
  const next = nextMilestone(streak);
  if (!next) return 1;
  const reached = reachedMilestones(streak);
  const prevDays = reached.length ? reached[reached.length - 1].days : 0;
  const span = next.days - prevDays;
  if (span <= 0) return 1;
  return Math.min(1, Math.max(0, (streak - prevDays) / span));
}

/** The full ladder annotated with reached / next flags (for rendering). */
export function streakLadder(streak: number): LadderStep[] {
  const next = nextMilestone(streak);
  return STREAK_MILESTONES.map((m) => ({
    ...m,
    reached: streak >= m.days,
    isNext: next != null && m.days === next.days,
  }));
}

/**
 * The milestone newly crossed when a streak grows `prev` → `next` (e.g. after
 * today's daily). Returns the highest one crossed, or null. Used to celebrate.
 */
export function milestoneCrossed(prev: number, next: number): StreakMilestone | null {
  const crossed = STREAK_MILESTONES.filter((m) => m.days > prev && m.days <= next);
  return crossed.length ? crossed[crossed.length - 1] : null;
}

/** Current live Daily streak from local state. */
export function currentStreak(): number {
  return getDailyState().streak;
}
