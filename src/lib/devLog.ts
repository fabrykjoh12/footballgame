/**
 * Development-only logging. In production these are no-ops, so a swallowed
 * transient error is still visible to a developer without spamming real users
 * or shipping console noise. Never throws.
 */

function isDev(): boolean {
  try {
    return Boolean(import.meta.env?.DEV);
  } catch {
    return false;
  }
}

/** Warn in development only (e.g. a failed critical realtime publish). */
export function devWarn(scope: string, message: string, err?: unknown): void {
  if (!isDev()) return;
  try {
    // eslint-disable-next-line no-console
    console.warn(`[${scope}] ${message}`, err ?? '');
  } catch {
    /* logging must never break the app */
  }
}
