/**
 * "Manager Merry-go-round" — name a manager who managed BOTH clubs. Pure
 * selection + matching over the managers dataset; best streak stored locally.
 * Mirrors the Connections pattern but for managers.
 */

import { MANAGERS, type Manager } from '../data/managers';
import { canonicalClub } from '../data/clubs';
import type { Rng } from './seededRandom';

/** Normalise a name: lowercase, strip accents/punctuation, collapse spaces. */
export function normalizeManagerName(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[._'`’-]/g, ' ')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Managers who managed BOTH clubs (any known spelling). */
export function managersForClubPair(clubA: string, clubB: string, pool: Manager[] = MANAGERS): Manager[] {
  const a = canonicalClub(clubA);
  const b = canonicalClub(clubB);
  if (a === b) return [];
  return pool.filter((m) => m.clubs.includes(a) && m.clubs.includes(b));
}

/** Does `input` name a manager who managed both clubs? */
export function matchesManagerPair(
  input: string | null | undefined,
  clubA: string,
  clubB: string,
  pool: Manager[] = MANAGERS,
): boolean {
  if (!input) return false;
  const n = normalizeManagerName(input);
  if (n.length < 2) return false;
  for (const m of managersForClubPair(clubA, clubB, pool)) {
    for (const cand of [m.name, ...m.aliases]) {
      const cn = normalizeManagerName(cand);
      if (!cn) continue;
      if (n === cn || cn.endsWith(' ' + n)) return true;
    }
  }
  return false;
}

export interface ManagerRound {
  clubA: string;
  clubB: string;
  /** A manager who satisfies the pair (the headline answer). */
  answer: Manager;
}

/**
 * Build a solvable round: pick a manager with >=2 clubs and two of their clubs.
 * The pair is guaranteed to have at least that manager as an answer.
 */
export function pickManagerRound(rng: Rng, pool: Manager[] = MANAGERS, excludeKeys: string[] = []): ManagerRound | null {
  const eligible = pool.filter((m) => m.clubs.length >= 2);
  if (eligible.length === 0) return null;
  // Try a handful of times to avoid a recently-used pair.
  for (let attempt = 0; attempt < 12; attempt++) {
    const m = eligible[Math.floor(rng() * eligible.length)];
    const i = Math.floor(rng() * m.clubs.length);
    let j = Math.floor(rng() * m.clubs.length);
    if (j === i) j = (j + 1) % m.clubs.length;
    const [clubA, clubB] = [m.clubs[i], m.clubs[j]].sort();
    const key = `${clubA}|${clubB}`;
    if (!excludeKeys.includes(key)) return { clubA, clubB, answer: m };
  }
  // Fallback: first eligible manager's first two clubs.
  const m = eligible[0];
  return { clubA: m.clubs[0], clubB: m.clubs[1], answer: m };
}

/** Up to `limit` spelling suggestions for a typed query (prefix-first). */
let NAME_POOL: string[] | null = null;
export function suggestManagerNames(query: string, limit = 6, pool: Manager[] = MANAGERS): string[] {
  if (!NAME_POOL) NAME_POOL = [...new Set(pool.map((m) => m.name))].sort((a, b) => a.localeCompare(b));
  const q = normalizeManagerName(query);
  if (q.length < 2) return [];
  const prefix: string[] = [];
  const contains: string[] = [];
  for (const name of NAME_POOL) {
    const n = normalizeManagerName(name);
    if (n.startsWith(q) || n.includes(' ' + q)) prefix.push(name);
    else if (n.includes(q)) contains.push(name);
    if (prefix.length >= limit) break;
  }
  return [...prefix, ...contains].slice(0, limit);
}

/* ------------------------------------------------------------------ */
/* Best-streak persistence                                             */
/* ------------------------------------------------------------------ */

const KEY = 'bk_managers_v1';

export interface ManagerProgress {
  bestStreak: number;
  played: number;
}

const EMPTY: ManagerProgress = { bestStreak: 0, played: 0 };

export function foldManagerResult(prev: ManagerProgress, streak: number): ManagerProgress {
  return { bestStreak: Math.max(prev.bestStreak, streak), played: prev.played + 1 };
}

export function getManagerProgress(): ManagerProgress {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...EMPTY, ...(JSON.parse(raw) as ManagerProgress) } : { ...EMPTY };
  } catch {
    return { ...EMPTY };
  }
}

export function recordManagerResult(streak: number): { progress: ManagerProgress; isBest: boolean } {
  const prev = getManagerProgress();
  const isBest = streak > prev.bestStreak;
  const next = foldManagerResult(prev, streak);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable */
  }
  return { progress: next, isBest };
}
