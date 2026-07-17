/**
 * The Scout — seeded CPU opponent.
 *
 * The CPU reasons exactly like the detective panel: it keeps the set of
 * catalog rules consistent with its evidence, probes the player that best
 * splits that set (information-greedy over a seeded sample), and accuses when
 * the set is small. `sharpness` in [0,1] tunes how often it plays the optimal
 * probe and how boldly it gambles on a near-certain accusation — so the CPU
 * is competent but beatable. Deterministic given the rng.
 */

import type { Player } from '../playerDb';
import type { Rng } from '../seededRandom';
import type { ScoutCategory } from './categories';
import {
  consistentCategories,
  type ScoutRound,
  type ScoutSide,
  canProbe,
  hasProbed,
} from './engine';

export type ScoutCpuAction =
  | { type: 'probe'; player: Player }
  | { type: 'accuse'; categoryId: string };

/** Secrets that overlap with neighbours hide best — clubs and leagues read as
 * nationalities/eras under early evidence, so weight them up. */
const KIND_WEIGHT: Record<ScoutCategory['kind'], number> = {
  club: 3,
  league: 3,
  nationality: 2,
  era: 2,
  trophy: 2,
  'club-count': 2,
  travel: 2,
  career: 2,
  position: 1,
  continent: 1,
};

export function cpuPickSecret(catalog: ScoutCategory[], rng: Rng): string {
  const total = catalog.reduce((n, c) => n + KIND_WEIGHT[c.kind], 0);
  let roll = rng() * total;
  for (const cat of catalog) {
    roll -= KIND_WEIGHT[cat.kind];
    if (roll <= 0) return cat.id;
  }
  return catalog[catalog.length - 1].id;
}

const PROBE_SAMPLE = 30;

/** How many of the still-consistent rules a probe candidate would split off. */
function splitScore(candidate: Player, consistent: ScoutCategory[]): number {
  let fits = 0;
  for (const cat of consistent) if (cat.test(candidate)) fits++;
  return Math.min(fits, consistent.length - fits);
}

/**
 * Decide the CPU's move for its turn. Never accuses a rule it has already
 * accused or that contradicts its evidence; always accuses when certain.
 */
export function cpuChooseAction(
  round: ScoutRound,
  side: ScoutSide,
  catalog: ScoutCategory[],
  players: Player[],
  rng: Rng,
  sharpness = 0.75,
): ScoutCpuAction {
  const accused = new Set(round.accusations[side].map((a) => a.categoryId));
  const consistent = consistentCategories(round.probes[side], catalog, players).filter(
    (c) => !accused.has(c.id),
  );

  const accuseFrom = (pool: ScoutCategory[]): ScoutCpuAction => ({
    type: 'accuse',
    categoryId: pool[Math.floor(rng() * pool.length)].id,
  });

  // The true secret is always consistent, so an empty set only happens on a
  // stale catalog — fall back to any un-accused rule rather than stalling.
  if (consistent.length === 0) {
    const rest = catalog.filter((c) => !accused.has(c.id));
    return accuseFrom(rest.length > 0 ? rest : catalog);
  }
  if (consistent.length === 1 || !canProbe(round, side)) return accuseFrom(consistent);
  // Near-certain: sharper CPUs gamble sooner instead of probing to certainty.
  if (consistent.length <= 3 && rng() < 0.2 + sharpness * 0.4) return accuseFrom(consistent);

  // Probe: score a seeded sample of unprobed players by how evenly they split
  // the consistent set; play the best with probability `sharpness`.
  const unprobed = players.filter((p) => !hasProbed(round, side, p.id));
  if (unprobed.length === 0) return accuseFrom(consistent);
  const sample: Player[] = [];
  const pool = [...unprobed];
  while (sample.length < Math.min(PROBE_SAMPLE, pool.length) && pool.length > 0) {
    sample.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  }
  let best = sample[0];
  let bestScore = -1;
  for (const candidate of sample) {
    const score = splitScore(candidate, consistent);
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }
  const pick = rng() < sharpness ? best : sample[Math.floor(rng() * sample.length)];
  return { type: 'probe', player: pick };
}
