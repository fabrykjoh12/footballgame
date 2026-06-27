/**
 * Online leaderboards — thin, SDK-free wrappers over the Firestore backend.
 *
 * Two boards: a per-day board for the Daily Challenge (everyone plays the same
 * 10 questions, so scores are comparable) and an all-time best board. Scoring is
 * client-trusted (the host runs the engine), so these are for casual bragging
 * rights, NOT ranked integrity — see the note in `submitScore`.
 *
 * The board-id helpers are pure and unit-tested; the read/write helpers lazily
 * import the Firebase backend so the SDK stays code-split, and no-op when
 * sign-in isn't configured.
 */

import { isFirebaseConfigured } from './firebaseConfig';
import { todayString } from './seededRandom';

export const ALLTIME_BOARD_ID = 'alltime-best';

/** Board id for a given day's Daily Challenge, e.g. "daily-2026-06-27". */
export function dailyBoardId(dateStr: string = todayString()): string {
  return `daily-${dateStr}`;
}

/** A human label for a board id (for headings). */
export function boardLabel(boardId: string): string {
  if (boardId === ALLTIME_BOARD_ID) return 'All-time best';
  if (boardId.startsWith('daily-')) return `Daily Challenge · ${boardId.slice('daily-'.length)}`;
  return boardId;
}

export interface LeaderboardEntry {
  uid: string;
  name: string;
  score: number;
  updatedAt: number;
}

/** Whether online leaderboards are even possible in this build. */
export function leaderboardsAvailable(): boolean {
  return isFirebaseConfigured;
}

/**
 * Submit a score. Casual play only — because scoring is client-trusted this is
 * not cheat-proof; treat the boards as friendly bragging rights. No-ops when
 * unconfigured or signed out.
 */
export async function submitScore(
  boardId: string,
  entry: { uid: string; name: string; score: number },
): Promise<void> {
  if (!isFirebaseConfigured) return;
  try {
    const backend = await import('../services/firebaseBackend');
    await backend.submitLeaderboardScore(boardId, entry);
  } catch {
    /* offline / transient — leaderboards are best-effort */
  }
}

const PB_KEY = 'bk_pb_v1';

/** This device's best single-match score (used to gate all-time submissions). */
export function localBestScore(): number {
  try {
    const raw = localStorage.getItem(PB_KEY);
    const n = raw ? Number(raw) : 0;
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

/**
 * Submit to the all-time board only when it beats this device's previous best,
 * so a later weaker match never overwrites a stronger entry. Returns true if a
 * new best was submitted.
 */
export async function submitPersonalBest(entry: {
  uid: string;
  name: string;
  score: number;
}): Promise<boolean> {
  if (entry.score <= localBestScore()) return false;
  try {
    localStorage.setItem(PB_KEY, String(entry.score));
  } catch {
    /* storage unavailable */
  }
  await submitScore(ALLTIME_BOARD_ID, entry);
  return true;
}

/** Fetch the top entries for a board (descending by score). */
export async function loadLeaderboard(
  boardId: string,
  topN = 50,
): Promise<LeaderboardEntry[]> {
  if (!isFirebaseConfigured) return [];
  try {
    const backend = await import('../services/firebaseBackend');
    return await backend.fetchLeaderboard(boardId, topN);
  } catch {
    return [];
  }
}
