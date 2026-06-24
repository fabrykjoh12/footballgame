/**
 * Deterministic PRNG helpers. Used by the Daily Challenge so every player gets
 * the same 10 questions, in the same order, with the same answer layout on a
 * given calendar day. Pure functions — no global state.
 */

export type Rng = () => number;

/** mulberry32 — small, fast, well-distributed seeded PRNG returning [0, 1). */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stable 32-bit FNV-1a hash of a string → unsigned int seed. */
export function hashString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Local calendar date as YYYY-MM-DD. */
export function todayString(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** The previous calendar day for a YYYY-MM-DD string. */
export function previousDay(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - 1);
  return todayString(
    new Date(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()),
  );
}

/** Seed for a given day's Daily Challenge. */
export function dailySeed(dateStr = todayString()): number {
  return hashString(`ball-knowledge:${dateStr}`);
}
