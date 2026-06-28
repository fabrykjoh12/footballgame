/**
 * Mystery Player Duel — local persistence: remembered room settings + a tiny
 * lifetime record. Pure merge helper + a thin localStorage wrapper.
 */

import { notifyProgressChanged } from '../progress';
import { DEFAULT_SETTINGS, type RoomSettings } from './mysteryPlayerTypes';

const KEY = 'bk_mystery_v1';

export interface MysteryStore {
  settings: RoomSettings;
  wins: number;
  losses: number;
}

const EMPTY: MysteryStore = { settings: { ...DEFAULT_SETTINGS }, wins: 0, losses: 0 };

export function mergeStore(partial: Partial<MysteryStore> | null | undefined): MysteryStore {
  const p = partial ?? {};
  return {
    settings: { ...DEFAULT_SETTINGS, ...(p.settings ?? {}) },
    wins: p.wins ?? 0,
    losses: p.losses ?? 0,
  };
}

export function getMysteryStore(): MysteryStore {
  try {
    const raw = localStorage.getItem(KEY);
    return mergeStore(raw ? (JSON.parse(raw) as Partial<MysteryStore>) : null);
  } catch {
    return { ...EMPTY };
  }
}

function write(store: MysteryStore): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
    notifyProgressChanged();
  } catch {
    /* storage unavailable */
  }
}

export function saveMysterySettings(settings: RoomSettings): void {
  write({ ...getMysteryStore(), settings });
}

export function recordDuelResult(won: boolean): MysteryStore {
  const prev = getMysteryStore();
  const next: MysteryStore = {
    ...prev,
    wins: prev.wins + (won ? 1 : 0),
    losses: prev.losses + (won ? 0 : 1),
  };
  write(next);
  return next;
}
