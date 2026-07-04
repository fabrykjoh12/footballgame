/**
 * Mystery Duel — investigation feedback (pure).
 *
 * Turns the raw candidate maths into detective-flavoured signal: how many
 * suspects a player's latest scout report eliminated, the clue's strength, a
 * suspicion (progress) meter, and a line of commentary. Drives the "case file"
 * presentation without touching the engine.
 */

import { candidateCount } from './mysteryPlayerCandidateFilter';
import { MYSTERY_PLAYERS } from '../../data/mysteryPlayers';
import type { MysteryState } from './mysteryPlayerTypes';

export type ClueStrength = 'Weak' | 'Useful' | 'Huge' | 'Killer';

export interface ClueFeedback {
  /** Suspects still consistent with everything this player has learned. */
  remaining: number;
  /** Suspects removed by the most recent verified report (0 if none yet). */
  eliminated: number;
  before: number; // pool size before the latest report
  strength: ClueStrength | null; // null → no verified report yet
  /** 0..1 progress toward a single suspect (the suspicion meter). */
  suspicion: number;
}

export const MYSTERY_POOL_SIZE = MYSTERY_PLAYERS.length;

/** Grade a clue by the fraction of the prior pool it eliminated. */
export function clueStrength(eliminated: number, before: number): ClueStrength {
  if (before <= 0 || eliminated <= 0) return 'Weak';
  const frac = eliminated / before;
  if (frac >= 0.5) return 'Killer';
  if (frac >= 0.2) return 'Huge';
  if (frac >= 0.06) return 'Useful';
  return 'Weak';
}

/** Investigation state for a player (from their accumulated verified facts). */
export function investigationFeedback(state: MysteryState, playerId: string): ClueFeedback {
  const facts = state.knowledge[playerId] ?? [];
  const remaining = candidateCount(MYSTERY_PLAYERS, facts);
  const total = MYSTERY_POOL_SIZE;
  const suspicion = total > 1 ? Math.min(1, (total - remaining) / (total - 1)) : 1;
  if (facts.length === 0) {
    return { remaining, eliminated: 0, before: remaining, strength: null, suspicion };
  }
  const before = candidateCount(MYSTERY_PLAYERS, facts.slice(0, -1));
  const eliminated = Math.max(0, before - remaining);
  return { remaining, eliminated, before, strength: clueStrength(eliminated, before), suspicion };
}

/** A commentary line reacting to the latest report. */
export function clueCommentary(f: ClueFeedback): string {
  if (f.strength === null) return 'Cold case — request your first scout report to open it.';
  if (f.eliminated <= 0) return 'No suspects ruled out — that lead went nowhere.';
  const s = f.eliminated === 1 ? 'suspect' : 'suspects';
  const tail =
    f.remaining <= 1
      ? ' You have your prime suspect.'
      : f.remaining <= 4
        ? ' The net is closing.'
        : f.remaining <= 12
          ? ' Down to a shortlist.'
          : '';
  return `That report eliminated ${f.eliminated} ${s}.${tail}`;
}
