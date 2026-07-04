/**
 * The Scout — pure duel engine.
 *
 * Both sides hold a secret scouting rule (a catalog category id). Players
 * alternate turns; on your turn you either PROBE one player (the engine
 * answers whether they fit the opponent's secret rule — auto-verified, no
 * lying possible) or ACCUSE (commit to a rule). A correct accusation wins the
 * round; a wrong one is recorded publicly and costs the accuser their next
 * turn. Probes are capped so a round can't stall forever — once a side is out
 * of probes, only accusations remain.
 *
 * Pure functions over immutable state; illegal moves throw (the UI never
 * produces them). Service-agnostic, so an online layer can drive it later the
 * same way Mystery Duel's engine is driven.
 */

import type { Player } from '../playerDb';
import { scoutCategoryById, type ScoutCategory } from './categories';

export type ScoutSide = 'A' | 'B';

export interface ScoutProbe {
  playerId: string;
  playerName: string;
  /** Whether the player fits the OPPONENT's secret rule. */
  fits: boolean;
}

export interface ScoutAccusation {
  categoryId: string;
  label: string;
}

export interface ScoutRound {
  /** Secret rule (category id) per side. */
  secrets: Record<ScoutSide, string>;
  turn: ScoutSide;
  /** Probes MADE BY a side, i.e. evidence about the opponent's rule. */
  probes: Record<ScoutSide, ScoutProbe[]>;
  /** Wrong accusations made by a side (public information). */
  accusations: Record<ScoutSide, ScoutAccusation[]>;
  /** Pending lost turns from wrong accusations. */
  skips: Record<ScoutSide, number>;
  phase: 'playing' | 'over';
  winner: ScoutSide | null;
}

export const SCOUT_MAX_PROBES = 15;

export function otherSide(side: ScoutSide): ScoutSide {
  return side === 'A' ? 'B' : 'A';
}

export function startScoutRound(
  secretA: string,
  secretB: string,
  firstTurn: ScoutSide = 'A',
): ScoutRound {
  return {
    secrets: { A: secretA, B: secretB },
    turn: firstTurn,
    probes: { A: [], B: [] },
    accusations: { A: [], B: [] },
    skips: { A: 0, B: 0 },
    phase: 'playing',
    winner: null,
  };
}

/** Hand the turn to the opponent — unless a pending skip keeps it here. */
function advanceTurn(round: ScoutRound): ScoutRound {
  const opp = otherSide(round.turn);
  if (round.skips[opp] > 0) {
    return { ...round, skips: { ...round.skips, [opp]: round.skips[opp] - 1 } };
  }
  return { ...round, turn: opp };
}

function assertTurn(round: ScoutRound, side: ScoutSide): void {
  if (round.phase !== 'playing') throw new Error('round is over');
  if (round.turn !== side) throw new Error(`not ${side}'s turn`);
}

export function canProbe(round: ScoutRound, side: ScoutSide): boolean {
  return round.probes[side].length < SCOUT_MAX_PROBES;
}

export function hasProbed(round: ScoutRound, side: ScoutSide, playerId: string): boolean {
  return round.probes[side].some((p) => p.playerId === playerId);
}

/** Probe a player against the opponent's secret rule. */
export function probeRule(
  round: ScoutRound,
  side: ScoutSide,
  player: Player,
  catalog: ScoutCategory[],
): ScoutRound {
  assertTurn(round, side);
  if (!canProbe(round, side)) throw new Error('out of probes');
  if (hasProbed(round, side, player.id)) throw new Error('player already probed');
  const secret = scoutCategoryById(round.secrets[otherSide(side)], catalog);
  if (!secret) throw new Error('unknown secret category');
  const probe: ScoutProbe = { playerId: player.id, playerName: player.name, fits: secret.test(player) };
  return advanceTurn({
    ...round,
    probes: { ...round.probes, [side]: [...round.probes[side], probe] },
  });
}

/** Accuse: commit to the opponent's rule. Correct wins; wrong costs a turn. */
export function accuseRule(
  round: ScoutRound,
  side: ScoutSide,
  categoryId: string,
  catalog: ScoutCategory[],
): ScoutRound {
  assertTurn(round, side);
  if (round.accusations[side].some((a) => a.categoryId === categoryId)) {
    throw new Error('category already accused');
  }
  if (categoryId === round.secrets[otherSide(side)]) {
    return { ...round, phase: 'over', winner: side };
  }
  const cat = scoutCategoryById(categoryId, catalog);
  const accusation: ScoutAccusation = { categoryId, label: cat?.label ?? categoryId };
  return advanceTurn({
    ...round,
    accusations: { ...round.accusations, [side]: [...round.accusations[side], accusation] },
    skips: { ...round.skips, [side]: round.skips[side] + 1 },
  });
}

/**
 * Catalog categories consistent with a body of evidence: every probed player's
 * fits/doesn't verdict must match the category. The detective panel and the
 * CPU both reason with this.
 */
export function consistentCategories(
  probes: ScoutProbe[],
  catalog: ScoutCategory[],
  players: Player[],
): ScoutCategory[] {
  if (probes.length === 0) return catalog;
  const byId = new Map(players.map((p) => [p.id, p]));
  const evidence = probes
    .map((probe) => ({ player: byId.get(probe.playerId), fits: probe.fits }))
    .filter((e): e is { player: Player; fits: boolean } => e.player !== undefined);
  return catalog.filter((cat) => evidence.every((e) => cat.test(e.player) === e.fits));
}
