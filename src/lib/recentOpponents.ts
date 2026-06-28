/**
 * Recent opponents — a short local list of real people you've just played
 * (bots are excluded), so you can add them as a friend or rematch straight
 * after a game. Local-first; the merge/cap rule is pure + unit-tested.
 */

import { h2hKey } from './headToHead';

const KEY = 'bk_recent_opps_v1';
export const RECENT_CAP = 12;

export interface RecentOpponent {
  name: string;
  games: number;
  lastPlayedAt: number;
}

/**
 * Pure: fold an opponent into the list — merge by normalised name (bumping the
 * game count + timestamp and refreshing the spelling), sort most-recent-first,
 * and cap the length.
 */
export function addRecentOpponent(
  list: RecentOpponent[],
  name: string,
  at: number,
  cap = RECENT_CAP,
): RecentOpponent[] {
  const trimmed = name.trim();
  if (!trimmed) return list;
  const key = h2hKey(trimmed);

  const rest = list.filter((o) => h2hKey(o.name) !== key);
  const prev = list.find((o) => h2hKey(o.name) === key);
  const merged: RecentOpponent = {
    name: trimmed,
    games: (prev?.games ?? 0) + 1,
    lastPlayedAt: at,
  };
  return [merged, ...rest]
    .sort((a, b) => b.lastPlayedAt - a.lastPlayedAt)
    .slice(0, cap);
}

export function getRecentOpponents(): RecentOpponent[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as RecentOpponent[]) : [];
  } catch {
    return [];
  }
}

/** Record an opponent you just faced (call only for real, non-bot players). */
export function recordOpponent(name: string, at: number = Date.now()): RecentOpponent[] {
  const updated = addRecentOpponent(getRecentOpponents(), name, at);
  try {
    localStorage.setItem(KEY, JSON.stringify(updated));
  } catch {
    /* storage unavailable */
  }
  return updated;
}
