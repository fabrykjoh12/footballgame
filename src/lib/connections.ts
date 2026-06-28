/**
 * "Connections" solo mode — pure logic (selection, fuzzy matching, scoring,
 * progress, autocomplete index). Fully self-contained: it never touches the 1v1
 * match engine, mirroring the solo-arcade pattern.
 */

import type { Difficulty, PointsBreakdown } from '../types/game';
import { QUESTIONS } from '../data/questions';
import { CONNECTIONS, type Connection } from '../data/connections';
import { PLAYERS, playersForClubPair } from '../data/players';
import { pushSeen } from './questionHistory';

export type { Connection } from '../data/connections';

/** Puzzles per run, and the difficulty ramp across those slots. */
export const CONNECTIONS_RUN_LENGTH = 10;
const RUN_RAMP: Difficulty[] = [
  'easy',
  'easy',
  'easy',
  'medium',
  'medium',
  'medium',
  'medium',
  'hard',
  'hard',
  'nightmare',
];

/** Per-puzzle clock — longer than a tap question because you type the answer. */
export const CONNECTIONS_QUESTION_MS = 30_000;

/* ------------------------------------------------------------------ */
/* Fuzzy name matching                                                 */
/* ------------------------------------------------------------------ */

/** Normalise a name: lowercase, strip accents/punctuation, collapse spaces. */
export function normalizeName(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip combining diacritics
    .replace(/[._'`’-]/g, ' ') // punctuation/apostrophes → space
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * The full set of accepted players for a puzzle: its hand-curated `accept` list
 * (the headline answers, shown on the reveal) UNION everyone in the player
 * database who actually played for both clubs. The DB augmentation is what lets
 * an obscure-but-valid answer count even if nobody hand-listed it — and it gets
 * better automatically as the roster grows.
 */
export function acceptedPlayersFor(conn: Connection): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const add = (name: string) => {
    const norm = normalizeName(name);
    if (norm && !seen.has(norm)) {
      seen.add(norm);
      out.push(name);
    }
  };
  conn.accept.forEach(add);
  for (const p of playersForClubPair(conn.clubA, conn.clubB)) add(p.name);
  return out;
}

/**
 * Does `input` name an accepted player for this puzzle? Forgiving: matches a
 * full name, a trailing portion (surname or multi-word surname like
 * "van der vaart"), or a configured alias/nickname. Accepts both the curated
 * list and any DB player who played for both clubs.
 */
export function matchesConnection(input: string | null | undefined, conn: Connection): boolean {
  if (!input) return false;
  const n = normalizeName(input);
  if (n.length < 2) return false;
  const candidates = [...conn.accept, ...(conn.aliases ?? [])];
  for (const p of playersForClubPair(conn.clubA, conn.clubB)) {
    candidates.push(p.name, ...p.aliases);
  }
  for (const player of candidates) {
    const pn = normalizeName(player);
    if (!pn) continue;
    if (n === pn) return true;
    // Trailing-portion match: "henry" → "thierry henry", "van der vaart" → full.
    if (pn.endsWith(' ' + n)) return true;
  }
  return false;
}

/* ------------------------------------------------------------------ */
/* Autocomplete index (spelling help, does not reveal answers)         */
/* ------------------------------------------------------------------ */

let NAME_INDEX: string[] | null = null;

/**
 * A de-duplicated list of real player names for the input's autocomplete.
 * Sourced from the whole question bank (Who Am I / Career Path options) plus
 * every Connections answer — so suggestions span hundreds of players and never
 * single out the current puzzle's answer.
 */
export function playerNameIndex(): string[] {
  if (NAME_INDEX) return NAME_INDEX;
  const set = new Map<string, string>(); // normalized → display
  const add = (name: string) => {
    const norm = normalizeName(name);
    if (norm && !set.has(norm)) set.set(norm, name);
  };
  for (const q of QUESTIONS) {
    if (q.type === 'who_am_i' || q.type === 'career_path') {
      add(q.correctAnswer);
      for (const o of q.options) add(o);
    }
  }
  for (const c of CONNECTIONS) {
    for (const a of c.accept) add(a);
  }
  for (const p of PLAYERS) add(p.name);
  NAME_INDEX = [...set.values()].sort((a, b) => a.localeCompare(b));
  return NAME_INDEX;
}

/** Up to `limit` name suggestions for a typed query (prefix-first, then any). */
export function suggestNames(query: string, limit = 6): string[] {
  const q = normalizeName(query);
  if (q.length < 2) return [];
  const prefix: string[] = [];
  const contains: string[] = [];
  for (const name of playerNameIndex()) {
    const n = normalizeName(name);
    if (n.startsWith(q) || n.includes(' ' + q)) prefix.push(name);
    else if (n.includes(q)) contains.push(name);
    if (prefix.length >= limit) break;
  }
  return [...prefix, ...contains].slice(0, limit);
}

/* ------------------------------------------------------------------ */
/* Puzzle selection                                                    */
/* ------------------------------------------------------------------ */

function shuffle<T>(arr: readonly T[], rng: () => number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Build a run of puzzles following the difficulty ramp. Unseen puzzles come
 * first (using `recent`, oldest-first), then the stalest are reused if a tier
 * runs dry — so repeats fall on the least-recently-played puzzle.
 */
export function pickConnections(
  recent: readonly string[] = [],
  pool: Connection[] = CONNECTIONS,
  rng: () => number = Math.random,
): Connection[] {
  const rank = new Map(recent.map((id, i) => [id, i] as const));
  const usedIds = new Set<string>();
  const out: Connection[] = [];

  const orderByFreshness = (list: Connection[]): Connection[] => {
    const unseen = shuffle(list.filter((c) => !rank.has(c.id)), rng);
    const seen = list
      .filter((c) => rank.has(c.id))
      .sort((a, b) => rank.get(a.id)! - rank.get(b.id)!); // stalest first
    return [...unseen, ...seen];
  };

  for (const target of RUN_RAMP) {
    const tierFirst = orderByFreshness(pool.filter((c) => c.difficulty === target && !usedIds.has(c.id)));
    const anyElse = orderByFreshness(pool.filter((c) => !usedIds.has(c.id)));
    const pick = tierFirst[0] ?? anyElse[0];
    if (pick) {
      usedIds.add(pick.id);
      out.push(pick);
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Scoring (football feel, mirrors the main game)                      */
/* ------------------------------------------------------------------ */

const BASE_BY_DIFFICULTY: Record<Difficulty, number> = {
  easy: 700,
  medium: 800,
  hard: 900,
  nightmare: 1000,
};
const MAX_SPEED_BONUS = 250;
const STREAK_BONUS: Record<number, number> = { 2: 50, 3: 100 };
const STREAK_BONUS_MAX = 150; // 4+

export interface ConnectionGrade {
  isCorrect: boolean;
  breakdown: PointsBreakdown;
  newStreak: number;
}

/** Grade one typed answer. `timeLeftFraction` in [0,1] drives the speed bonus. */
export function gradeConnection(
  conn: Connection,
  input: string | null,
  timeLeftFraction: number,
  streak: number,
): ConnectionGrade {
  const isCorrect = matchesConnection(input, conn);
  if (!isCorrect) {
    return { isCorrect: false, breakdown: { base: 0, speedBonus: 0, streakBonus: 0, total: 0 }, newStreak: 0 };
  }
  const base = BASE_BY_DIFFICULTY[conn.difficulty];
  const speedBonus = Math.round(MAX_SPEED_BONUS * Math.max(0, Math.min(1, timeLeftFraction)));
  const newStreak = streak + 1;
  const streakBonus = newStreak >= 4 ? STREAK_BONUS_MAX : STREAK_BONUS[newStreak] ?? 0;
  return {
    isCorrect: true,
    breakdown: { base, speedBonus, streakBonus, total: base + speedBonus + streakBonus },
    newStreak,
  };
}

/* ------------------------------------------------------------------ */
/* Per-device freshness + best-score persistence                       */
/* ------------------------------------------------------------------ */

const HISTORY_KEY = 'bk_conn_history_v1';
const HISTORY_LIMIT = 20; // ~two runs of memory before a puzzle can recur
const PROGRESS_KEY = 'bk_connections_v1';

export interface ConnectionsProgress {
  bestScore: number;
  bestCorrect: number;
  bestStreak: number;
  played: number;
}

const EMPTY_PROGRESS: ConnectionsProgress = { bestScore: 0, bestCorrect: 0, bestStreak: 0, played: 0 };

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...(JSON.parse(raw) as T) } : fallback;
  } catch {
    return fallback;
  }
}

export function recentConnectionIds(): readonly string[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function recordSeenConnections(ids: readonly string[]): void {
  if (typeof localStorage === 'undefined' || ids.length === 0) return;
  try {
    const next = pushSeen(recentConnectionIds(), ids, HISTORY_LIMIT);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable */
  }
}

export function getConnectionsProgress(): ConnectionsProgress {
  if (typeof localStorage === 'undefined') return { ...EMPTY_PROGRESS };
  return readJson(PROGRESS_KEY, EMPTY_PROGRESS);
}

/** Fold a finished run into the saved bests. Returns the new progress + isBest. */
export function recordConnectionsResult(run: {
  score: number;
  correct: number;
  bestStreak: number;
}): { progress: ConnectionsProgress; isBest: boolean } {
  const prev = getConnectionsProgress();
  const isBest = run.score > prev.bestScore;
  const next: ConnectionsProgress = {
    bestScore: Math.max(prev.bestScore, run.score),
    bestCorrect: Math.max(prev.bestCorrect, run.correct),
    bestStreak: Math.max(prev.bestStreak, run.bestStreak),
    played: prev.played + 1,
  };
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable */
  }
  return { progress: next, isBest };
}
