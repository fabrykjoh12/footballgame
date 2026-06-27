/**
 * Safe, typed localStorage helpers.
 *
 * Storage can throw (private mode, quota, disabled cookies) or be absent (SSR /
 * tests), so every access is guarded and falls back gracefully — persistence is
 * a nice-to-have, never a crash risk.
 */

function available(): Storage | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage;
  } catch {
    return null;
  }
}

export function loadJSON<T>(key: string, fallback: T): T {
  const store = available();
  if (!store) return fallback;
  try {
    const raw = store.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function saveJSON(key: string, value: unknown): void {
  const store = available();
  if (!store) return;
  try {
    store.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / disabled — persistence is best-effort */
  }
}

export function removeKey(key: string): void {
  const store = available();
  if (!store) return;
  try {
    store.removeItem(key);
  } catch {
    /* ignore */
  }
}
