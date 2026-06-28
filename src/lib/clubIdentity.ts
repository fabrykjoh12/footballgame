/**
 * Ball Knowledge — user-created club identity (pure core + local persistence).
 *
 * Lets a player create their own fictional club: name, short name, two kit
 * colours, stadium, nickname and a badge style. The club's `name` becomes the
 * player's match name (so it flows through `teamName` → scoreline, timeline,
 * post-match, shares), and its primary colour is registered as a kit override
 * (`teamIdentity.registerClubKit`) so the club's colour shows everywhere.
 *
 * License-free only: abstract badge shapes + colours + type, never real club
 * branding. Men's-football flavour. Stored locally (`bk_club_v1`).
 */

import { teamIdentity, registerClubKit } from './teamIdentity';
import { notifyProgressChanged } from './progress';

const KEY = 'bk_club_v1';

export type BadgeStyle = 'shield' | 'circle' | 'diamond' | 'hexagon';

export const BADGE_STYLES: { id: BadgeStyle; label: string }[] = [
  { id: 'shield', label: 'Shield' },
  { id: 'circle', label: 'Roundel' },
  { id: 'diamond', label: 'Diamond' },
  { id: 'hexagon', label: 'Crest' },
];

/** A curated, legible kit palette for the colour pickers. */
export const KIT_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#06b6d4',
  '#3b82f6', '#6366f1', '#a855f7', '#ec4899', '#f43f5e', '#ffffff',
  '#94a3b8', '#1e293b',
] as const;

export interface ClubIdentity {
  /** Full club name, e.g. "Modock United". */
  name: string;
  /** Short tag, 2–4 chars, e.g. "MOD". */
  shortName: string;
  /** Primary kit colour (hex). */
  primary: string;
  /** Secondary / accent colour (hex). */
  secondary: string;
  stadium: string;
  nickname: string;
  badge: BadgeStyle;
}

export const NAME_MAX = 24;
export const SHORT_MIN = 2;
export const SHORT_MAX = 4;
export const STADIUM_MAX = 28;
export const NICKNAME_MAX = 28;

/** Uppercased alphanumeric tag, capped at SHORT_MAX. */
export function normalizeShortName(s: string): string {
  return s
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, SHORT_MAX);
}

/** Derive a short tag from a club name (initials, else first letters). */
export function suggestShortName(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return normalizeShortName(words.map((w) => w[0]).join(''));
  }
  return normalizeShortName((words[0] ?? 'BK').slice(0, 3));
}

/**
 * A sensible default identity derived from a plain player name, so the editor
 * opens pre-filled and players who never customise still get a coherent club.
 */
export function defaultClubIdentity(playerName = 'You'): ClubIdentity {
  const base = (playerName || 'You').trim() || 'You';
  // Single-word handle → give it a club-style name; multi-word kept as-is.
  const name = /\s/.test(base) ? base : `${base} FC`;
  const primary = teamIdentity(name).color;
  const short = suggestShortName(name);
  return {
    name,
    shortName: short,
    primary,
    secondary: '#ffffff',
    stadium: `${base.split(/\s+/)[0]} Park`,
    nickname: 'The Stars',
    badge: 'shield',
  };
}

export interface ValidationResult {
  identity: ClubIdentity;
  errors: Partial<Record<keyof ClubIdentity, string>>;
  ok: boolean;
}

/** Clean + validate a draft identity. Returns the normalized identity + errors. */
export function validateClubIdentity(draft: Partial<ClubIdentity>): ValidationResult {
  const base = defaultClubIdentity();
  const name = (draft.name ?? '').trim().slice(0, NAME_MAX);
  const shortName = normalizeShortName(draft.shortName ?? '');
  const identity: ClubIdentity = {
    name: name || base.name,
    shortName: shortName || base.shortName,
    primary: draft.primary ?? base.primary,
    secondary: draft.secondary ?? base.secondary,
    stadium: (draft.stadium ?? '').trim().slice(0, STADIUM_MAX) || base.stadium,
    nickname: (draft.nickname ?? '').trim().slice(0, NICKNAME_MAX) || base.nickname,
    badge: draft.badge ?? base.badge,
  };

  const errors: ValidationResult['errors'] = {};
  if (!name) errors.name = 'Give your club a name.';
  if (shortName.length < SHORT_MIN) errors.shortName = `At least ${SHORT_MIN} letters.`;
  if (draft.primary && draft.secondary && draft.primary === draft.secondary) {
    errors.secondary = 'Pick a different accent colour.';
  }

  return { identity, errors, ok: Object.keys(errors).length === 0 };
}

/* ------------------------------------------------------------------ */
/* Persistence                                                         */
/* ------------------------------------------------------------------ */

export function getClubIdentity(): ClubIdentity | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ClubIdentity>;
    const { identity } = validateClubIdentity(parsed);
    return identity;
  } catch {
    return null;
  }
}

export function saveClubIdentity(identity: ClubIdentity): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(identity));
    registerClubKit(identity.name, identity.primary);
    notifyProgressChanged();
  } catch {
    /* storage unavailable */
  }
}

export function clearClubIdentity(): void {
  try {
    const existing = getClubIdentity();
    if (existing) registerClubKit(existing.name, null);
    localStorage.removeItem(KEY);
    notifyProgressChanged();
  } catch {
    /* storage unavailable */
  }
}

/** Register the saved club's kit colour so it shows in matches. Call at boot. */
export function hydrateClubKit(): void {
  const id = getClubIdentity();
  if (id) registerClubKit(id.name, id.primary);
}
