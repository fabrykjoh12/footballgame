/**
 * Local cache + result submission for friend leagues.
 *
 * The cache lets the UI show your leagues instantly (and offline), and lets the
 * Daily-result submitter know which leagues to post to without going through the
 * React tree. The Firebase backend is dynamically imported so the SDK stays
 * code-split, and every call no-ops when sign-in isn't configured.
 */

import type { League } from './leagues';

const CACHE_KEY = 'bk_leagues_v1';

export function getCachedLeagues(): League[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as League[]) : [];
  } catch {
    return [];
  }
}

export function setCachedLeagues(leagues: League[]): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(leagues));
  } catch {
    /* storage unavailable */
  }
}

/**
 * Post a Daily Challenge result to every league the player belongs to. Safe to
 * call unconditionally — it returns early when there are no cached leagues, and
 * the backend calls no-op when Firebase isn't configured.
 */
export async function submitDailyToLeagues(
  member: { uid: string; name: string },
  dateKey: string,
  points: number,
): Promise<void> {
  const leagues = getCachedLeagues();
  if (leagues.length === 0 || typeof window === 'undefined') return;
  try {
    const backend = await import('../services/firebaseBackend');
    const at = Date.now();
    await Promise.all(
      leagues.map((l) =>
        backend
          .submitLeagueResult(l.id, { uid: member.uid, key: dateKey, points, at })
          .catch(() => {}),
      ),
    );
  } catch {
    /* offline / unconfigured — leagues are best-effort */
  }
}
