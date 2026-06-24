/**
 * Seedable, deterministic pseudo-random number generator.
 *
 * Every random draw in the game (question selection, CPU answers, team themes)
 * flows through here so that matches and tests are fully reproducible.
 *
 * Uses the mulberry32 algorithm — tiny, fast, and good enough for a trivia game.
 */
export interface Rng {
  /** Float in [0, 1). */
  next(): number;
  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number;
  /** Random element of a non-empty array. */
  pick<T>(items: readonly T[]): T;
  /** Returns a new array with the items shuffled (Fisher–Yates). */
  shuffle<T>(items: readonly T[]): T[];
  /** True with probability `p` (clamped to [0, 1]). */
  chance(p: number): boolean;
}

export function createRng(seed: number): Rng {
  let state = seed >>> 0;

  const next = (): number => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const int = (min: number, max: number): number => {
    if (max < min) [min, max] = [max, min];
    return min + Math.floor(next() * (max - min + 1));
  };

  const pick = <T>(items: readonly T[]): T => {
    if (items.length === 0) throw new Error('rng.pick: empty array');
    return items[int(0, items.length - 1)] as T;
  };

  const shuffle = <T>(items: readonly T[]): T[] => {
    const out = items.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = int(0, i);
      [out[i], out[j]] = [out[j] as T, out[i] as T];
    }
    return out;
  };

  const chance = (p: number): boolean => next() < Math.max(0, Math.min(1, p));

  return { next, int, pick, shuffle, chance };
}

/** Derive a stable numeric seed from an arbitrary string (e.g. a matchId). */
export function seedFromString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
