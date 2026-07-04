/**
 * Derived manager level + XP — a single global progression number computed
 * purely from lifetime profile stats (no new storage). Powers the top bar and
 * the Your Club panel. Deterministic and testable.
 */

import type { ProfileStats } from './profileStats';

const XP = { win: 100, draw: 45, loss: 35, correct: 5, goal: 15 } as const;

/** Total lifetime XP from a stats snapshot. */
export function totalXp(s: ProfileStats): number {
  return (
    s.wins * XP.win +
    s.draws * XP.draw +
    s.losses * XP.loss +
    s.totalCorrect * XP.correct +
    s.goalsScored * XP.goal
  );
}

/** XP needed to climb *within* a given level to the next (rising curve). */
export function levelSpan(level: number): number {
  return 250 + (level - 1) * 150;
}

export interface PlayerLevel {
  level: number;
  xp: number; // total lifetime
  intoLevel: number; // xp accumulated inside the current level
  span: number; // xp width of the current level
  toNext: number; // xp remaining to the next level
  progress: number; // 0..1 within the current level
  title: string; // rank name
}

const RANKS: Array<[number, string]> = [
  [25, 'Legend'],
  [17, 'World Class'],
  [12, 'Elite'],
  [8, 'Professional'],
  [5, 'Semi-Pro'],
  [3, 'Amateur'],
  [1, 'Sunday League'],
];

export function rankTitle(level: number): string {
  for (const [min, title] of RANKS) if (level >= min) return title;
  return 'Sunday League';
}

/** Full level breakdown for a stats snapshot. */
export function playerLevel(s: ProfileStats): PlayerLevel {
  const xp = totalXp(s);
  let level = 1;
  let rem = xp;
  // Cap the loop defensively; the curve makes this converge quickly anyway.
  while (level < 999 && rem >= levelSpan(level)) {
    rem -= levelSpan(level);
    level++;
  }
  const span = levelSpan(level);
  return {
    level,
    xp,
    intoLevel: rem,
    span,
    toNext: span - rem,
    progress: span > 0 ? rem / span : 0,
    title: rankTitle(level),
  };
}
