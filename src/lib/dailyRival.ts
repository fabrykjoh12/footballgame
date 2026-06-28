/**
 * Daily Rival Match — pure helpers that turn the deterministic Daily Challenge
 * into a proper one-a-day *fixture*: a named fictional rival club for the day,
 * a fixture label, a "tomorrow" countdown, and shareable "beat my result"
 * challenge links. All deterministic per calendar day (seeded), so everyone
 * faces the same rival, and all pure / unit-tested.
 *
 * No real clubs — the rival pool is fictional, men's-football-only flavour.
 */

import type { Category } from '../types/game';
import { dailySeed, hashString, mulberry32, todayString } from './seededRandom';

/** Fictional, license-free rival clubs (men's football flavour). */
export const DAILY_RIVALS = [
  'Modock United',
  'Tønsberg Albion',
  'Sandefjord Scholars',
  'Northbridge Athletic',
  'Redgate United',
  'Ironwell FC',
  'Kingsport Rovers',
  'Eastbank Albion',
  'Hollowmere Town',
  'Castleton Wanderers',
  'Pinehurst City',
  'Vale Park Rangers',
  'Greyford United',
  'Marlowe Athletic',
  'Stormont Rovers',
  'Ashcombe FC',
] as const;

/** The deterministic rival club name for a given day. */
export function dailyRivalName(dateStr: string = todayString()): string {
  const seed = dailySeed(dateStr);
  return DAILY_RIVALS[seed % DAILY_RIVALS.length];
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

/** Human fixture label for a day, e.g. "Matchday · Fri 27 Jun". */
export function dailyFixtureLabel(dateStr: string = todayString()): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return 'Matchday';
  // Construct a local date purely from the parts (no tz drift for labelling).
  const dt = new Date(y, m - 1, d);
  return `Matchday · ${WEEKDAYS[dt.getDay()]} ${d} ${MONTHS[m - 1]}`;
}

/** Milliseconds until the next local midnight from `now`. */
export function msUntilNextDay(now: Date = new Date()): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  return Math.max(0, next.getTime() - now.getTime());
}

/** Format a millisecond duration as a compact "Hh Mm" (or "Mm" under an hour). */
export function formatCountdown(ms: number): string {
  const totalMin = Math.floor(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h <= 0) return `${m}m`;
  return `${h}h ${m}m`;
}

/* ------------------------------------------------------------------ */
/* "Beat my result" challenge links                                    */
/* ------------------------------------------------------------------ */

export interface DailyChallengeParams {
  /** The day the result is for (YYYY-MM-DD). */
  date: string;
  /** Goals scored by the challenger. */
  goalsFor: number;
  /** Goals conceded by the challenger. */
  goalsAgainst: number;
  /** The challenger's point total (the figure to beat). */
  score: number;
  /** Optional challenger club/display name. */
  by?: string;
}

/**
 * Build a shareable "beat my result" URL. `baseUrl` is typically
 * `window.location.origin + window.location.pathname`. Kept pure so the link
 * format is unit-tested and stable.
 */
export function buildDailyChallengeLink(baseUrl: string, p: DailyChallengeParams): string {
  const qs = new URLSearchParams({
    daily: p.date,
    gf: String(p.goalsFor),
    ga: String(p.goalsAgainst),
    s: String(p.score),
  });
  if (p.by) qs.set('by', p.by);
  const sep = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${sep}${qs.toString()}`;
}

/** Parse a `?daily=…` challenge query string. Returns null if absent/invalid. */
export function parseDailyChallengeParams(
  query: string,
): DailyChallengeParams | null {
  let qs: URLSearchParams;
  try {
    qs = new URLSearchParams(query.startsWith('?') ? query.slice(1) : query);
  } catch {
    return null;
  }
  const date = qs.get('daily');
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const num = (k: string) => {
    const raw = qs.get(k);
    if (raw === null || raw.trim() === '') return null;
    const v = Number(raw);
    return Number.isFinite(v) ? v : null;
  };
  const gf = num('gf');
  const ga = num('ga');
  const s = num('s');
  if (gf === null || ga === null || s === null) return null;
  return {
    date,
    goalsFor: Math.max(0, Math.trunc(gf)),
    goalsAgainst: Math.max(0, Math.trunc(ga)),
    score: Math.max(0, Math.trunc(s)),
    by: qs.get('by') ?? undefined,
  };
}

/* ------------------------------------------------------------------ */
/* Share text                                                          */
/* ------------------------------------------------------------------ */

export interface DailyShareInput {
  goalsFor: number;
  goalsAgainst: number;
  outcome: 'win' | 'loss' | 'draw';
  bestCategory?: Category | null;
  link?: string;
}

const RESULT_VERB: Record<DailyShareInput['outcome'], string> = {
  win: 'won',
  loss: 'lost',
  draw: 'drew',
};

/** Share text for a Daily Rival result, e.g. for the clipboard fallback. */
export function buildDailyShareText(input: DailyShareInput): string {
  const verb = RESULT_VERB[input.outcome];
  const head = `I ${verb} today’s Ball Knowledge Daily ${input.goalsFor}–${input.goalsAgainst}.`;
  const tail = input.outcome === 'win' ? ' Can you beat me?' : ' Think you can do better?';
  return input.link ? `${head}${tail}\n${input.link}` : `${head}${tail}`;
}

/**
 * A small deterministic flavour adjective for the day's fixture, so the card
 * reads a little differently each day without any randomness.
 */
export function dailyFixtureMood(dateStr: string = todayString()): string {
  const moods = [
    'A tricky away day.',
    'Top-of-the-table clash.',
    'A banana skin if you switch off.',
    'Derby-day intensity.',
    'Cup-tie tension.',
    'A statement-match opportunity.',
  ];
  const rng = mulberry32(hashString(`mood:${dateStr}`));
  return moods[Math.floor(rng() * moods.length)];
}
