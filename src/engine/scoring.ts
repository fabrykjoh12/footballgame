/**
 * Scoring: convert trivia outcomes into a football-style scoreline.
 *
 * Rules (deliberately simple and deterministic):
 *  - A correct answer is a *chance*. Whether it becomes a goal depends on its
 *    `quality` (speed/closeness): high quality finishes are clinical, scrappy
 *    ones can be saved.
 *  - An incorrect answer never scores.
 *  - Both participants are scored independently each question, so a single
 *    question can end 1–1, 1–0, 0–0, etc.
 *
 * The quality→goal mapping is a pure threshold so results are reproducible and
 * unit-testable without randomness. (CPU answer *generation* uses the seeded
 * RNG; goal *conversion* here is deterministic given an outcome.)
 */

import type {
  AnswerOutcome,
  MatchSummary,
  PlayerInfo,
  OpponentInfo,
  QuestionResult,
  Scoreline,
  Side,
} from '../types/match.ts';

/** Quality at or above this converts a correct answer into a goal. */
export const GOAL_QUALITY_THRESHOLD = 0.5;

/** A rare "worldie" — exceptional quality scores a brace on one question. */
export const BRACE_QUALITY_THRESHOLD = 0.92;

export function goalsFor(outcome: AnswerOutcome): number {
  if (!outcome.correct) return 0;
  if (outcome.quality >= BRACE_QUALITY_THRESHOLD) return 2;
  if (outcome.quality >= GOAL_QUALITY_THRESHOLD) return 1;
  return 0;
}

export function resolveQuestion(
  index: number,
  miniGame: QuestionResult['miniGame'],
  player: AnswerOutcome,
  opponent: AnswerOutcome,
): QuestionResult {
  return {
    index,
    miniGame,
    player,
    opponent,
    playerGoals: goalsFor(player),
    opponentGoals: goalsFor(opponent),
  };
}

/** Tally a list of resolved questions into a home/away scoreline. */
export function tallyScoreline(
  results: readonly QuestionResult[],
  playerSide: Side,
): Scoreline {
  let playerTotal = 0;
  let opponentTotal = 0;
  for (const r of results) {
    playerTotal += r.playerGoals;
    opponentTotal += r.opponentGoals;
  }
  return playerSide === 'home'
    ? { home: playerTotal, away: opponentTotal }
    : { home: opponentTotal, away: playerTotal };
}

export function isLevel(score: Scoreline): boolean {
  return score.home === score.away;
}

/** Decide the winning side from a (post-tiebreaker) scoreline. */
export function winnerFromScoreline(score: Scoreline): Side | 'draw' {
  if (score.home > score.away) return 'home';
  if (score.away > score.home) return 'away';
  return 'draw';
}

export function buildSummary(
  results: readonly QuestionResult[],
  player: PlayerInfo,
  opponent: OpponentInfo,
  wentToTiebreaker: boolean,
): MatchSummary {
  const scoreline = tallyScoreline(results, player.side);
  return {
    scoreline,
    winner: winnerFromScoreline(scoreline),
    results: results.slice(),
    wentToTiebreaker,
    player,
    opponent,
  };
}

/**
 * Map a 0..9 question index onto a 1'..90' match minute for the timeline UI.
 * Question 1 ≈ 5', question 10 ≈ 90'.
 */
export function questionToMinute(index: number, total: number): number {
  if (total <= 1) return 45;
  const ratio = index / (total - 1);
  return Math.max(1, Math.round(5 + ratio * 85));
}
