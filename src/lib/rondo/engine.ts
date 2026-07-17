/**
 * Rondo — pure head-to-head engine.
 *
 * A "rondo" is the keep-ball drill: players pass the ball around a circle and
 * whoever loses control gives it away. Here a shared **category** is drawn from
 * the Scout catalog (auto-verifiable rules over the player DB — "Played for
 * Barcelona", "Argentina internationals", "Won the Champions League"…), and the
 * two sides take turns **naming footballers who fit it**. Each valid name is a
 * pass that keeps the ball moving; a wrong name, a repeat, or letting the clock
 * run out is a turnover — the opponent wins the rally and scores a goal. First
 * to `target` goals wins the match; each new rally draws a fresh category.
 *
 * Pure functions over immutable state; illegal moves throw (the UI never makes
 * them). Turn-based + secretless, so an online layer can drive it later exactly
 * like the Scout / Mystery engines. Validation reuses the Scout `ScoutCategory`
 * so both modes share one auto-verified catalog.
 */

import type { Player } from '../playerDb';
import type { ScoutCategory } from '../scout/categories';

export type RondoSide = 'A' | 'B';

export function otherRondoSide(side: RondoSide): RondoSide {
  return side === 'A' ? 'B' : 'A';
}

export type RondoBreak = 'wrong' | 'repeat' | 'timeout';

export interface RondoNamed {
  side: RondoSide;
  playerId: string;
  playerName: string;
}

/** One rally: a single category played until someone gives the ball away. */
export interface RondoRally {
  categoryId: string;
  label: string;
  /** Who names first this rally. */
  server: RondoSide;
  /** Whose turn it is now. */
  turn: RondoSide;
  /** Every accepted name, in order. */
  named: RondoNamed[];
  /** Named player ids (repeat detection). */
  usedIds: string[];
  phase: 'playing' | 'over';
  /** Who gave the ball away (loses the rally), once over. */
  loser: RondoSide | null;
  reason: RondoBreak | null;
}

export interface RondoMatch {
  /** Goals needed to win the match. */
  target: number;
  scores: Record<RondoSide, number>;
  rally: RondoRally;
  /** 1-based rally index within the match. */
  rallyNumber: number;
  phase: 'playing' | 'over';
  winner: RondoSide | null;
}

export type NameResult = 'ok' | RondoBreak;

export interface NameOutcome {
  rally: RondoRally;
  result: NameResult;
}

export function startRondoRally(
  categoryId: string,
  label: string,
  server: RondoSide,
): RondoRally {
  return {
    categoryId,
    label,
    server,
    turn: server,
    named: [],
    usedIds: [],
    phase: 'playing',
    loser: null,
    reason: null,
  };
}

export function startRondoMatch(target: number, firstRally: RondoRally): RondoMatch {
  return {
    target,
    scores: { A: 0, B: 0 },
    rally: firstRally,
    rallyNumber: 1,
    phase: 'playing',
    winner: null,
  };
}

function assertTurn(rally: RondoRally, side: RondoSide): void {
  if (rally.phase !== 'playing') throw new Error('rally is over');
  if (rally.turn !== side) throw new Error(`not ${side}'s turn`);
}

function breakRally(rally: RondoRally, loser: RondoSide, reason: RondoBreak): RondoRally {
  return { ...rally, phase: 'over', loser, reason };
}

/**
 * Name a player on your turn. A valid, unused, fitting player keeps the rally
 * alive and passes the turn; anything else ends the rally with you as the loser.
 */
export function nameInRondo(
  rally: RondoRally,
  side: RondoSide,
  player: Player,
  category: ScoutCategory,
): NameOutcome {
  assertTurn(rally, side);
  if (rally.usedIds.includes(player.id)) {
    return { rally: breakRally(rally, side, 'repeat'), result: 'repeat' };
  }
  if (!category.test(player)) {
    return { rally: breakRally(rally, side, 'wrong'), result: 'wrong' };
  }
  return {
    rally: {
      ...rally,
      named: [...rally.named, { side, playerId: player.id, playerName: player.name }],
      usedIds: [...rally.usedIds, player.id],
      turn: otherRondoSide(side),
    },
    result: 'ok',
  };
}

/** The side on the clock let it expire (or gave up) — they lose the rally. */
export function timeoutRondo(rally: RondoRally): RondoRally {
  if (rally.phase !== 'playing') throw new Error('rally is over');
  return breakRally(rally, rally.turn, 'timeout');
}

/** Fold a finished rally into the match score; may end the match. */
export function concludeRally(match: RondoMatch, rally: RondoRally): RondoMatch {
  if (rally.phase !== 'over' || rally.loser === null) {
    throw new Error('rally is not finished');
  }
  const winner = otherRondoSide(rally.loser);
  const scores = { ...match.scores, [winner]: match.scores[winner] + 1 };
  const done = scores[winner] >= match.target;
  return {
    ...match,
    rally,
    scores,
    phase: done ? 'over' : 'playing',
    winner: done ? winner : null,
  };
}

/** Begin the next rally (server alternates so pressure is shared fairly). */
export function nextRondoRally(
  match: RondoMatch,
  categoryId: string,
  label: string,
): RondoMatch {
  if (match.phase === 'over') throw new Error('match is over');
  const server = otherRondoSide(match.rally.server);
  return {
    ...match,
    rally: startRondoRally(categoryId, label, server),
    rallyNumber: match.rallyNumber + 1,
  };
}

/** How many of each side's names are in the current rally (for the UI tally). */
export function rallyTally(rally: RondoRally): Record<RondoSide, number> {
  return {
    A: rally.named.filter((n) => n.side === 'A').length,
    B: rally.named.filter((n) => n.side === 'B').length,
  };
}
