/**
 * "Career Path" — guess the player from their club history. A survival mode:
 * the club chain is revealed one club at a time (fewer clubs seen = more
 * points); name the player to keep your streak alive. Powered entirely by the
 * central player database (each player's `clubs`). Pure selection + matching;
 * best streak stored locally.
 */

import { PLAYERS } from '../data/players';
import type { Player } from './playerDb';
import type { Rng } from './seededRandom';

/** Normalise a name: lowercase, strip accents/punctuation, collapse spaces. */
export function normalizePlayerName(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[._'`’-]/g, ' ')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Does `input` name this player? Accepts full name, surname, or an alias. */
export function matchesPlayer(input: string | null | undefined, player: Player): boolean {
  if (!input) return false;
  const n = normalizePlayerName(input);
  if (n.length < 2) return false;
  const candidates = [player.name, ...player.aliases];
  for (const c of candidates) {
    const cn = normalizePlayerName(c);
    if (!cn) continue;
    if (n === cn) return true;
    if (cn.endsWith(' ' + n)) return true; // trailing surname match
  }
  return false;
}

/** Players with a club chain long enough to make an interesting puzzle. */
export function careerPathPool(minClubs = 3, players: Player[] = PLAYERS): Player[] {
  return players.filter((p) => p.clubs.length >= minClubs);
}

export function pickCareerPlayer(pool: Player[], rng: Rng, excludeIds: string[] = []): Player | null {
  const choices = pool.filter((p) => !excludeIds.includes(p.id));
  if (choices.length === 0) return null;
  return choices[Math.floor(rng() * choices.length)];
}

/** Up to `limit` spelling suggestions for a typed query (prefix-first). */
let NAME_POOL: string[] | null = null;
export function suggestPlayerNames(query: string, limit = 6, players: Player[] = PLAYERS): string[] {
  if (!NAME_POOL) {
    NAME_POOL = [...new Set(players.map((p) => p.name))].sort((a, b) => a.localeCompare(b));
  }
  const q = normalizePlayerName(query);
  if (q.length < 2) return [];
  const prefix: string[] = [];
  const contains: string[] = [];
  for (const name of NAME_POOL) {
    const n = normalizePlayerName(name);
    if (n.startsWith(q) || n.includes(' ' + q)) prefix.push(name);
    else if (n.includes(q)) contains.push(name);
    if (prefix.length >= limit) break;
  }
  return [...prefix, ...contains].slice(0, limit);
}

/* ------------------------------------------------------------------ */
/* Scoring                                                             */
/* ------------------------------------------------------------------ */

/**
 * Points for a correct guess, scaled by how few clubs were revealed. Guessing
 * with only the first club shown pays the most; revealing the whole chain pays
 * a floor. `revealed` and `total` are club counts (1..total).
 */
export function careerPathPoints(revealed: number, total: number): number {
  const MAX = 1000;
  const MIN = 200;
  if (total <= 1) return MAX;
  const frac = (revealed - 1) / (total - 1); // 0 when only 1 shown, 1 when all shown
  return Math.round(MAX - (MAX - MIN) * Math.max(0, Math.min(1, frac)));
}

/* ------------------------------------------------------------------ */
/* Best-streak / best-score persistence                               */
/* ------------------------------------------------------------------ */

const KEY = 'bk_career_path_v1';

export interface CareerPathProgress {
  bestStreak: number;
  bestScore: number;
  played: number;
}

const EMPTY: CareerPathProgress = { bestStreak: 0, bestScore: 0, played: 0 };

/** Pure: fold a finished run into prior progress. */
export function foldCareerPathResult(
  prev: CareerPathProgress,
  streak: number,
  score: number,
): CareerPathProgress {
  return {
    bestStreak: Math.max(prev.bestStreak, streak),
    bestScore: Math.max(prev.bestScore, score),
    played: prev.played + 1,
  };
}

export function getCareerPathProgress(): CareerPathProgress {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...EMPTY, ...(JSON.parse(raw) as CareerPathProgress) } : { ...EMPTY };
  } catch {
    return { ...EMPTY };
  }
}

export function recordCareerPathResult(
  streak: number,
  score: number,
): { progress: CareerPathProgress; isBest: boolean } {
  const prev = getCareerPathProgress();
  const isBest = score > prev.bestScore;
  const next = foldCareerPathResult(prev, streak, score);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable */
  }
  return { progress: next, isBest };
}
