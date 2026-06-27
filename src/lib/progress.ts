/**
 * Local progress snapshot + reconcile rules for optional cloud sync.
 *
 * All durable singleplayer progress lives in three localStorage blobs (Career,
 * lifetime profile, Daily Challenge). When a player signs in, we sync this
 * snapshot to Supabase so it follows them across devices. The app stays fully
 * functional anonymously — sign-in only mirrors what's already local.
 *
 * The reconcile logic is pure (no DOM) so it can be unit-tested; the
 * localStorage read/write helpers are guarded for non-browser environments.
 */

export const CAREER_KEY = 'bk_career_v1';
export const PROFILE_KEY = 'bk_profile_v1';
export const DAILY_KEY = 'bk_daily_v1';

/** Fired whenever any progress blob is saved (drives the debounced cloud push). */
export const PROGRESS_EVENT = 'bk:progress-changed';
/** Fired after remote progress is written into localStorage (UI should re-read). */
export const PROGRESS_APPLIED_EVENT = 'bk:progress-applied';

/** A point-in-time snapshot of the three durable progress blobs. */
export interface ProgressSnapshot {
  career: unknown | null;
  profile: unknown | null;
  daily: unknown | null;
}

const EMPTY: ProgressSnapshot = { career: null, profile: null, daily: null };

function readKey(key: string): unknown | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as unknown) : null;
  } catch {
    return null;
  }
}

/** Current local progress, or all-null where unavailable. */
export function readLocalProgress(): ProgressSnapshot {
  if (typeof localStorage === 'undefined') return { ...EMPTY };
  return {
    career: readKey(CAREER_KEY),
    profile: readKey(PROFILE_KEY),
    daily: readKey(DAILY_KEY),
  };
}

/** Write a snapshot into localStorage and notify the UI to re-read. */
export function writeLocalProgress(snap: ProgressSnapshot): void {
  if (typeof localStorage === 'undefined') return;
  const put = (key: string, value: unknown) => {
    try {
      if (value == null) return; // never clobber a local blob with nothing
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage unavailable */
    }
  };
  put(CAREER_KEY, snap.career);
  put(PROFILE_KEY, snap.profile);
  put(DAILY_KEY, snap.daily);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(PROGRESS_APPLIED_EVENT));
  }
}

/** True when there is no meaningful progress to sync. */
export function isEmptyProgress(snap: ProgressSnapshot): boolean {
  return snap.career == null && snap.profile == null && snap.daily == null;
}

export interface Reconciled {
  /** The snapshot to keep (and write locally). */
  result: ProgressSnapshot;
  /** Whether the result adds anything the remote didn't have (→ push it up). */
  shouldPush: boolean;
}

/**
 * Merge local + remote progress on sign-in. Remote is the source of truth per
 * blob (it's your account), but local fills any gap the remote doesn't have —
 * so a first sign-in never wipes existing local progress.
 */
export function reconcileProgress(
  local: ProgressSnapshot,
  remote: ProgressSnapshot | null,
): Reconciled {
  const r = remote ?? { ...EMPTY };
  const result: ProgressSnapshot = {
    career: r.career ?? local.career ?? null,
    profile: r.profile ?? local.profile ?? null,
    daily: r.daily ?? local.daily ?? null,
  };
  const shouldPush = JSON.stringify(result) !== JSON.stringify(r);
  return { result, shouldPush };
}

/** Notify the cloud-sync layer that a progress blob just changed. */
export function notifyProgressChanged(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(PROGRESS_EVENT));
}
