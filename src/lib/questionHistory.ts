/**
 * Per-device question history — a small ring of the most recently seen question
 * IDs, used to keep matches feeling fresh by deprioritising questions a player
 * has just played. Purely local (no cloud sync): freshness is a device concern,
 * and it must never affect the deterministic Daily Challenge pick.
 *
 * The pure helpers (push/cap) are exported for unit testing; the localStorage
 * read/write is guarded for non-browser environments.
 */

const KEY = 'bk_history_v1';

/**
 * How many recent IDs to remember. Sized to span roughly a full type pool
 * (≈60 of each of the 10 mini-games ≈ the last 60 matches), so the picker can
 * walk through most of a type's questions before any repeat. When a shallow
 * pool is fully covered the picker degrades to an oldest-first round-robin
 * (see `prioritizeUnseen`), so a wide window never starves a mini-game — it
 * just makes reuse fall on the stalest question.
 */
export const HISTORY_LIMIT = 600;

/**
 * Append newly-seen IDs to a ring, most-recent last, de-duplicated (a repeat is
 * moved to the front of "recent"), capped at `limit`. Pure — no storage.
 */
export function pushSeen(
  existing: readonly string[],
  incoming: readonly string[],
  limit: number = HISTORY_LIMIT,
): string[] {
  const incomingSet = new Set(incoming);
  // Drop any prior occurrences of the incoming ids, then re-append them last.
  const kept = existing.filter((id) => !incomingSet.has(id));
  const merged = [...kept, ...incoming.filter((id, i) => incoming.indexOf(id) === i)];
  return merged.slice(Math.max(0, merged.length - limit));
}

function read(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

/** The list of recently-seen question IDs (oldest first). */
export function getSeenIds(): string[] {
  if (typeof localStorage === 'undefined') return [];
  return read();
}

/**
 * Recently-seen IDs in recency order (oldest first), for the picker to
 * deprioritise — and to reuse the *stalest* question first when fresh content
 * runs out.
 */
export function recentlySeenIds(): readonly string[] {
  return getSeenIds();
}

/** Record that a set of questions was just played. */
export function recordSeenQuestions(ids: readonly string[]): void {
  if (typeof localStorage === 'undefined' || ids.length === 0) return;
  try {
    const next = pushSeen(read(), ids);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable / full */
  }
}

/** Clear the history (used by stats reset). */
export function resetQuestionHistory(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable */
  }
}
