/**
 * Rondo — daily category, local progress + share text.
 *
 * Daily is a **solo endurance** rally on one seeded category (same for everyone,
 * like the Daily Challenge): name as many players as you can before a wrong or
 * repeated answer; your score is the streak of correct names. Progress persists
 * in `bk_rondo_v1`; folds are pure, mirroring the Scout / Daily-Connections
 * pattern. Vs-CPU duel results are recorded too (hot-seat has no owner to credit).
 */

import { hashString, previousDay, todayString } from '../seededRandom';
import { PLAYERS } from '../../data/players';
import { scoutCatalog, categoryMembers, type ScoutCategory } from '../scout/categories';

/** Categories with a healthy pool make for longer, fairer rallies. */
export const RONDO_MIN_POOL = 16;

let cachedCatalog: ScoutCategory[] | null = null;

/**
 * The Scout catalog trimmed to categories deep enough to sustain a rondo, so a
 * rally doesn't dead-end after a couple of names. Memoised (the roster is
 * static). Falls back to the full catalog if the filter is somehow too strict.
 */
export function rondoCatalog(): ScoutCategory[] {
  if (cachedCatalog) return cachedCatalog;
  const full = scoutCatalog();
  const deep = full.filter((c) => categoryMembers(c, PLAYERS).length >= RONDO_MIN_POOL);
  cachedCatalog = deep.length >= 8 ? deep : full;
  return cachedCatalog;
}

/** The one endurance category for a calendar day — deterministic across devices. */
export function dailyRondoCategory(dateStr: string = todayString()): ScoutCategory {
  const catalog = rondoCatalog();
  const idx = hashString(`bk-rondo:${dateStr}`) % catalog.length;
  return catalog[idx];
}

/* ------------------------------------------------------------------ */
/* Progress                                                            */
/* ------------------------------------------------------------------ */

const KEY = 'bk_rondo_v1';

export interface RondoDailyState {
  lastPlayedDate: string | null; // YYYY-MM-DD
  /** Consecutive days played. */
  streak: number;
  bestStreak: number;
  /** Best single-day endurance run (most names in a row). */
  bestRun: number;
  playsTotal: number;
}

export interface RondoProgress {
  duelsPlayed: number;
  duelsWon: number;
  daily: RondoDailyState;
}

const EMPTY: RondoProgress = {
  duelsPlayed: 0,
  duelsWon: 0,
  daily: { lastPlayedDate: null, streak: 0, bestStreak: 0, bestRun: 0, playsTotal: 0 },
};

export function getRondoProgress(): RondoProgress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(EMPTY);
    const parsed = JSON.parse(raw) as Partial<RondoProgress>;
    return { ...EMPTY, ...parsed, daily: { ...EMPTY.daily, ...(parsed.daily ?? {}) } };
  } catch {
    return structuredClone(EMPTY);
  }
}

function save(progress: RondoProgress): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(progress));
  } catch {
    /* storage unavailable */
  }
}

export function hasPlayedDailyRondoToday(
  progress: RondoProgress = getRondoProgress(),
  today: string = todayString(),
): boolean {
  return progress.daily.lastPlayedDate === today;
}

/** Pure: fold today's endurance run into prior progress (once per day). */
export function foldRondoDaily(prev: RondoProgress, run: number, today: string): RondoProgress {
  const d = prev.daily;
  if (d.lastPlayedDate === today) return prev; // already recorded today
  const streak = d.lastPlayedDate === previousDay(today) ? d.streak + 1 : 1;
  return {
    ...prev,
    daily: {
      lastPlayedDate: today,
      streak,
      bestStreak: Math.max(d.bestStreak, streak),
      bestRun: Math.max(d.bestRun, run),
      playsTotal: d.playsTotal + 1,
    },
  };
}

/** Pure: fold a finished vs-CPU duel into prior progress. */
export function foldRondoDuel(prev: RondoProgress, won: boolean): RondoProgress {
  return { ...prev, duelsPlayed: prev.duelsPlayed + 1, duelsWon: prev.duelsWon + (won ? 1 : 0) };
}

export function recordRondoDaily(run: number, today: string = todayString()): RondoProgress {
  const next = foldRondoDaily(getRondoProgress(), run, today);
  save(next);
  return next;
}

export function recordRondoDuel(won: boolean): RondoProgress {
  const next = foldRondoDuel(getRondoProgress(), won);
  save(next);
  return next;
}

/* ------------------------------------------------------------------ */
/* Share text                                                          */
/* ------------------------------------------------------------------ */

const SITE_URL = 'https://fabrykjoh12.github.io/footballgame/';

export function buildRondoDailyShareText(o: { run: number; label: string; streak: number }): string {
  const head = `⚽ Rondo — named ${o.run} for "${o.label}" before I lost the ball.`;
  const streak = o.streak > 1 ? ` 🔥 ${o.streak}-day streak.` : '';
  return `${head}${streak} Keep it up longer? ${SITE_URL}#daily-rondo`;
}

export function buildRondoDuelShareText(o: { won: boolean; a: number; b: number }): string {
  const head = o.won
    ? `⚽ Rondo — kept possession and beat the CPU ${o.a}–${o.b}.`
    : `⚽ Rondo — the CPU passed me off the park ${o.b}–${o.a}.`;
  return `${head} Football naming duel: ${SITE_URL}#rondo`;
}
