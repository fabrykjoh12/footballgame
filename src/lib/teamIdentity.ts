/**
 * Deterministic "club kit" identity derived from a player's name — a stable
 * colour so each side has a visual identity on the scoreboard / timeline.
 * No user input, no multiplayer sync: same name always maps to the same kit.
 */

import { hashString } from './seededRandom';

export interface TeamIdentity {
  /** Primary kit colour (hex). */
  color: string;
  /** Translucent fill for soft backgrounds. */
  soft: string;
  /** Translucent ring/border. */
  ring: string;
}

// Curated kit palette — vivid but legible on deep navy.
const KITS = [
  '#ef4444', // red
  '#3b82f6', // blue
  '#22c55e', // green
  '#eab308', // amber
  '#a855f7', // purple
  '#ec4899', // pink
  '#f97316', // orange
  '#06b6d4', // cyan
  '#f43f5e', // rose
  '#14b8a6', // teal
  '#8b5cf6', // violet
  '#84cc16', // lime
];

function hexToRgba(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

function normalizeKey(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Explicit kit-colour overrides by (normalized) club name. A created club
 * identity registers its chosen colour here so its kit shows everywhere the
 * derived palette is used (scoreboard, timeline, post-match) without threading
 * the colour through every call site. Names not registered fall back to the
 * deterministic palette below.
 */
const overrides = new Map<string, string>();

/** Register (or clear, with null) an explicit kit colour for a club name. */
export function registerClubKit(name: string, color: string | null): void {
  const key = normalizeKey(name);
  if (!key) return;
  if (color) overrides.set(key, color);
  else overrides.delete(key);
}

export function teamIdentity(name: string, salt = 0): TeamIdentity {
  const override = salt === 0 ? overrides.get(normalizeKey(name)) : undefined;
  const key = (normalizeKey(name) || 'player') + (salt ? `~${salt}` : '');
  const color = override ?? KITS[hashString(key) % KITS.length];
  return { color, soft: hexToRgba(color, 0.16), ring: hexToRgba(color, 0.55) };
}

/** Two guaranteed-distinct kits for a 1v1 (nudges the second on a collision). */
export function matchIdentities(
  nameA: string,
  nameB: string,
): [TeamIdentity, TeamIdentity] {
  const a = teamIdentity(nameA);
  let b = teamIdentity(nameB);
  for (let salt = 1; b.color === a.color && salt <= KITS.length; salt++) {
    b = teamIdentity(nameB, salt);
  }
  return [a, b];
}
