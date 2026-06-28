/**
 * Save management — export / import all local progress as a portable backup.
 *
 * Everything in Ball Knowledge is stored locally under `bk_`-prefixed keys
 * (career, profile, daily, club identity, feats, achievements, cosmetics,
 * settings, solo/connections progress…). This gathers them into one JSON
 * document the player can download, re-import, or copy as a backup code.
 *
 * The core (`buildBackup` / `dataFromBackup`) is pure over a plain key→value
 * map so it's unit-testable; the wrappers talk to localStorage.
 */

import { notifyProgressChanged } from './progress';

const PREFIX = 'bk_';
const FORMAT = 'ball-knowledge-backup';
const VERSION = 1;

export interface BackupFile {
  format: string;
  version: number;
  exportedAt: number;
  data: Record<string, string>;
}

/** Pure: build a backup document from a plain key→value store. */
export function buildBackup(store: Record<string, string>, exportedAt: number): BackupFile {
  const data: Record<string, string> = {};
  for (const [k, v] of Object.entries(store)) {
    if (k.startsWith(PREFIX)) data[k] = v;
  }
  return { format: FORMAT, version: VERSION, exportedAt, data };
}

/** Pure: validate a parsed object as a backup and return its data, or null. */
export function dataFromBackup(parsed: unknown): Record<string, string> | null {
  if (!parsed || typeof parsed !== 'object') return null;
  const f = parsed as Partial<BackupFile>;
  if (f.format !== FORMAT || typeof f.data !== 'object' || f.data === null) return null;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(f.data)) {
    if (k.startsWith(PREFIX) && typeof v === 'string') out[k] = v;
  }
  return out;
}

export function parseBackup(json: string): BackupFile | null {
  try {
    const parsed = JSON.parse(json) as unknown;
    const data = dataFromBackup(parsed);
    if (!data) return null;
    const f = parsed as BackupFile;
    return { format: FORMAT, version: f.version ?? VERSION, exportedAt: f.exportedAt ?? 0, data };
  } catch {
    return null;
  }
}

/** Unicode-safe base64 of a string (for copy-paste "backup codes"). */
export function encodeBackupCode(json: string): string {
  const bytes = new TextEncoder().encode(json);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

export function decodeBackupCode(code: string): string | null {
  try {
    const bin = atob(code.trim());
    const bytes = Uint8Array.from(bin, (ch) => ch.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* localStorage wrappers                                               */
/* ------------------------------------------------------------------ */

function snapshot(): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX)) {
        const v = localStorage.getItem(k);
        if (v !== null) out[k] = v;
      }
    }
  } catch {
    /* storage unavailable */
  }
  return out;
}

export function currentBackup(now: number = Date.now()): BackupFile {
  return buildBackup(snapshot(), now);
}

export function exportBackupJson(now: number = Date.now()): string {
  return JSON.stringify(currentBackup(now), null, 2);
}

/** What's stored locally, as friendly labels (for the "what's saved" list). */
const KEY_LABELS: Record<string, string> = {
  bk_career_v1: 'Career progress',
  bk_profile_v1: 'Profile & lifetime stats',
  bk_daily_v1: 'Daily Rival history',
  bk_club_v1: 'Your club identity',
  bk_feats_v1: 'Match feats',
  bk_achievements_v1: 'Achievements',
  bk_cosmetics_v1: 'Cosmetic unlocks',
  bk_settings_v1: 'Settings',
  bk_connections_v1: 'Connections best',
  bk_conn_history_v1: 'Connections freshness',
  bk_h2h_v1: 'Head-to-head records',
  bk_name: 'Display name',
  bk_sound: 'Sound preference',
};

export interface BackupItem {
  key: string;
  label: string;
  bytes: number;
}

export function describeBackup(file: BackupFile = currentBackup()): BackupItem[] {
  return Object.entries(file.data)
    .map(([key, value]) => ({
      key,
      label: KEY_LABELS[key] ?? key,
      bytes: value.length,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * Apply a backup's data into localStorage. By default merges (incoming keys win)
 * so an import never silently drops a key the file didn't include. Notifies the
 * app so providers re-read. Returns the number of keys written.
 */
export function applyBackup(data: Record<string, string>): number {
  let written = 0;
  try {
    for (const [k, v] of Object.entries(data)) {
      if (!k.startsWith(PREFIX)) continue;
      localStorage.setItem(k, v);
      written++;
    }
    if (written) notifyProgressChanged();
  } catch {
    /* storage unavailable */
  }
  return written;
}

/** Wipe all Ball Knowledge local data. Returns the number of keys removed. */
export function clearAllLocalData(): number {
  let removed = 0;
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX)) keys.push(k);
    }
    for (const k of keys) {
      localStorage.removeItem(k);
      removed++;
    }
    if (removed) notifyProgressChanged();
  } catch {
    /* storage unavailable */
  }
  return removed;
}
