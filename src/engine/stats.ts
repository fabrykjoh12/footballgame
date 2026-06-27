/**
 * Player stats & match history — pure aggregation over completed matches.
 *
 * Kept React-free and side-effect-free (persistence lives in the provider via
 * lib/storage.ts), so the accumulation logic is trivially unit-testable.
 */

import type { MatchSummary } from '../types/match.ts';

export interface PlayerStats {
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  correctAnswers: number;
  totalAnswers: number;
  /** Current unbeaten-by-result win streak (resets on any non-win). */
  currentStreak: number;
  bestStreak: number;
}

export function emptyStats(): PlayerStats {
  return {
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    correctAnswers: 0,
    totalAnswers: 0,
    currentStreak: 0,
    bestStreak: 0,
  };
}

/** Fold a finished match into the running totals. Pure. */
export function recordMatch(stats: PlayerStats, summary: MatchSummary): PlayerStats {
  const playerWon = summary.winner === summary.player.side;
  const draw = summary.winner === 'draw';

  const side = summary.player.side;
  const goalsFor = side === 'home' ? summary.scoreline.home : summary.scoreline.away;
  const goalsAgainst = side === 'home' ? summary.scoreline.away : summary.scoreline.home;

  const correct = summary.results.filter((r) => r.player.correct).length;

  const currentStreak = playerWon ? stats.currentStreak + 1 : 0;

  return {
    played: stats.played + 1,
    won: stats.won + (playerWon ? 1 : 0),
    drawn: stats.drawn + (draw ? 1 : 0),
    lost: stats.lost + (!playerWon && !draw ? 1 : 0),
    goalsFor: stats.goalsFor + goalsFor,
    goalsAgainst: stats.goalsAgainst + goalsAgainst,
    correctAnswers: stats.correctAnswers + correct,
    totalAnswers: stats.totalAnswers + summary.results.length,
    currentStreak,
    bestStreak: Math.max(stats.bestStreak, currentStreak),
  };
}

/** Win rate as a 0–100 integer percentage. */
export function winRate(stats: PlayerStats): number {
  if (stats.played === 0) return 0;
  return Math.round((stats.won / stats.played) * 100);
}

/** Trivia accuracy as a 0–100 integer percentage. */
export function accuracy(stats: PlayerStats): number {
  if (stats.totalAnswers === 0) return 0;
  return Math.round((stats.correctAnswers / stats.totalAnswers) * 100);
}

export function goalDifference(stats: PlayerStats): number {
  return stats.goalsFor - stats.goalsAgainst;
}
