/**
 * Rondo — deterministic CPU opponent.
 *
 * On its turn the CPU tries to name an unused player who fits the rally's
 * category. It models a fallible human: a "miss chance" that rises as the rally
 * gets longer (the obvious names run out) and is higher on easier difficulties.
 * When it misses — or the category is genuinely exhausted — it returns null and
 * gives the ball away. All randomness comes from the injected seeded RNG, so a
 * duel replays identically.
 */

import type { Rng } from '../seededRandom';
import type { Player } from '../playerDb';
import { categoryMembers, type ScoutCategory } from '../scout/categories';
import type { RondoRally } from './engine';

export type RondoDifficulty = 'casual' | 'pro' | 'legend';

const MISS_BASE: Record<RondoDifficulty, number> = {
  casual: 0.3,
  pro: 0.16,
  legend: 0.05,
};
/** Extra miss chance per name already played this rally. */
const MISS_STEP = 0.012;
const MISS_CAP = 0.75;

/** How many of the fewest-club (most "obvious") members the CPU will reach for. */
function knownPool(members: Player[], difficulty: RondoDifficulty): Player[] {
  // Fewer clubs ≈ more iconic/one-team names the CPU is likelier to know; on
  // higher difficulty it reaches deeper into the roster.
  const depth = difficulty === 'legend' ? 1 : difficulty === 'pro' ? 0.7 : 0.45;
  const sorted = [...members].sort(
    (a, b) => trophyCount(b) - trophyCount(a) || a.clubs.length - b.clubs.length || a.id.localeCompare(b.id),
  );
  return sorted.slice(0, Math.max(8, Math.ceil(sorted.length * depth)));
}

function trophyCount(p: Player): number {
  const t = p.trophies;
  return (
    Number(t.championsLeague) +
    Number(t.ballonDor) +
    Number(t.worldCup) +
    Number(t.euros) +
    Number(t.copaAmerica) +
    Number(t.leagueTitle)
  );
}

/**
 * Pick the CPU's name for the current rally, or null if it blanks / is stuck.
 * Never returns an already-used player.
 */
export function cpuNameInRondo(
  rally: RondoRally,
  category: ScoutCategory,
  players: Player[],
  rng: Rng,
  difficulty: RondoDifficulty = 'pro',
): Player | null {
  const used = new Set(rally.usedIds);
  const known = knownPool(categoryMembers(category, players), difficulty).filter((p) => !used.has(p.id));
  if (known.length === 0) return null;

  const miss = Math.min(MISS_CAP, MISS_BASE[difficulty] + rally.named.length * MISS_STEP);
  if (rng() < miss) return null;

  // Bias toward the more obvious names near the front of the known pool.
  const weight = rng();
  const idx = Math.floor(weight * weight * known.length); // squared → front-loaded
  return known[Math.min(idx, known.length - 1)];
}
