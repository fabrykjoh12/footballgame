/**
 * Private friend leagues — a season-long table among a group of friends.
 *
 * Fairness anchor: a league accumulates each member's **Daily Challenge** score
 * (everyone plays the identical 10 questions that day), so the table is a fair
 * season-long comparison rather than a "who farmed the most easy CPU games"
 * race. Each member contributes at most one result per day (deduped by date).
 *
 * This module is pure (no DOM / SDK) so the standings logic is unit-tested. The
 * online layer (create/join/sync) lives in `services/firebaseBackend.ts` and is
 * gated on Firebase sign-in, exactly like the friends + leaderboard features.
 */

/** Unambiguous alphabet (no 0/O, 1/I/L), shared with room/friend codes. */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_PREFIX = 'LG';
const CODE_BODY_LENGTH = 5;

export interface LeagueMember {
  uid: string;
  name: string;
}

export interface LeagueResult {
  uid: string;
  /** Dedupe key — one scoring event per key (e.g. the Daily date 'YYYY-MM-DD'). */
  key: string;
  /** Points this result contributes to the table (e.g. the Daily score). */
  points: number;
  /** When it was recorded (epoch ms), for display only. */
  at: number;
}

export interface League {
  id: string;
  name: string;
  /** Shareable join code, e.g. "LG7Q2K". */
  code: string;
  ownerUid: string;
  members: LeagueMember[];
  createdAt: number;
}

export interface StandingRow {
  uid: string;
  name: string;
  /** Distinct scoring events (e.g. days played). */
  played: number;
  /** Season total points. */
  points: number;
  /** Best single result, for tie-breaks + display. */
  best: number;
  /** 1-based position (ties share a position). */
  rank: number;
}

/* ------------------------------------------------------------------ */
/* Join codes (pure)                                                   */
/* ------------------------------------------------------------------ */

export function generateLeagueCode(): string {
  let body = '';
  for (let i = 0; i < CODE_BODY_LENGTH; i++) {
    body += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return CODE_PREFIX + body;
}

export function normalizeLeagueCode(input: string): string {
  return input.trim().toUpperCase().replace(/[\s-]+/g, '');
}

export function isValidLeagueCode(input: string): boolean {
  return /^LG[A-Z0-9]{5}$/.test(normalizeLeagueCode(input));
}

/* ------------------------------------------------------------------ */
/* Standings (pure)                                                    */
/* ------------------------------------------------------------------ */

interface Agg {
  uid: string;
  name: string;
  keys: Set<string>;
  points: number;
  best: number;
}

/**
 * Compute the league table from members + their submitted results.
 *
 * - Each member appears even with no results (played 0).
 * - A member's repeated results for the same `key` are de-duplicated, keeping
 *   the HIGHEST-points entry (so a practice replay can't lower your day).
 * - Ranked by total points desc, then best single result desc, then name asc.
 *   Rows that tie on all of those share a rank (standard competition ranking).
 */
export function computeStandings(
  members: LeagueMember[],
  results: LeagueResult[],
): StandingRow[] {
  const byUid = new Map<string, Agg>();
  for (const m of members) {
    byUid.set(m.uid, { uid: m.uid, name: m.name, keys: new Set(), points: 0, best: 0 });
  }

  // Keep the best result per (uid, key) so a member can't double-count a day.
  const bestPerKey = new Map<string, LeagueResult>();
  for (const r of results) {
    const k = `${r.uid}::${r.key}`;
    const prev = bestPerKey.get(k);
    if (!prev || r.points > prev.points) bestPerKey.set(k, r);
  }

  for (const r of bestPerKey.values()) {
    let agg = byUid.get(r.uid);
    if (!agg) {
      // A result from someone no longer listed as a member — still count them.
      agg = { uid: r.uid, name: r.uid, keys: new Set(), points: 0, best: 0 };
      byUid.set(r.uid, agg);
    }
    agg.keys.add(r.key);
    agg.points += r.points;
    agg.best = Math.max(agg.best, r.points);
  }

  const rows = [...byUid.values()]
    .map((a) => ({ uid: a.uid, name: a.name, played: a.keys.size, points: a.points, best: a.best, rank: 0 }))
    .sort((x, y) => y.points - x.points || y.best - x.best || x.name.localeCompare(y.name));

  // Standard competition ranking (ties share a rank, next rank skips).
  for (let i = 0; i < rows.length; i++) {
    if (i > 0 && rows[i].points === rows[i - 1].points && rows[i].best === rows[i - 1].best) {
      rows[i].rank = rows[i - 1].rank;
    } else {
      rows[i].rank = i + 1;
    }
  }
  return rows;
}

/** The Daily-Challenge result key for a date, e.g. "2026-06-27". */
export function dailyResultKey(dateStr: string): string {
  return dateStr;
}
