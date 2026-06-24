/**
 * Team identity generation — deterministic team names + color palettes.
 *
 * Strictly typographic/colour-based: zero copyrighted club assets. A seed (e.g.
 * derived from the match id or player name) produces a stable identity so a
 * rematch keeps the same colours.
 */

import type { TeamIdentity } from '../../types/match.ts';
import { createRng, seedFromString, type Rng } from '../../lib/rng.ts';

const NICKNAMES = [
  'FC',
  'United',
  'City',
  'Athletic',
  'Rovers',
  'Albion',
  'Wanderers',
  'Town',
  'Sporting',
  'Dynamo',
];

/** Pleasant, high-contrast-on-dark hues as `r g b` triplets. */
const PALETTE: Array<{ primary: string; secondary: string }> = [
  { primary: '57 255 122', secondary: '4 20 12' }, // neon green
  { primary: '96 165 250', secondary: '12 18 32' }, // sky blue
  { primary: '248 113 113', secondary: '32 12 12' }, // red
  { primary: '250 204 21', secondary: '32 26 4' }, // amber
  { primary: '167 139 250', secondary: '22 14 36' }, // violet
  { primary: '45 212 191', secondary: '6 28 26' }, // teal
  { primary: '244 114 182', secondary: '34 10 24' }, // pink
  { primary: '251 146 60', secondary: '32 18 6' }, // orange
];

function teamFromRng(displayName: string, rng: Rng): TeamIdentity {
  const nickname = rng.pick(NICKNAMES);
  const palette = rng.pick(PALETTE);
  // Use the player's first name as the club's root where possible.
  const root = displayName.trim().split(/\s+/)[0] || 'Athletic';
  return {
    name: `${root} ${nickname}`,
    primaryRgb: palette.primary,
    secondaryRgb: palette.secondary,
  };
}

export function generateTeam(displayName: string, seed: number): TeamIdentity {
  return teamFromRng(displayName, createRng(seed));
}

/**
 * Generate two visually distinct teams for a match. The away palette is forced
 * to differ from the home palette so the scoreboard never clashes.
 */
export function generateMatchTeams(
  homeName: string,
  awayName: string,
  matchId: string,
): { home: TeamIdentity; away: TeamIdentity } {
  const rng = createRng(seedFromString(matchId));
  const home = teamFromRng(homeName, rng);
  let away = teamFromRng(awayName, rng);
  let guard = 0;
  while (away.primaryRgb === home.primaryRgb && guard < 10) {
    away = teamFromRng(awayName, rng);
    guard++;
  }
  return { home, away };
}

/** Apply a team's colours to CSS variables on a target element (or :root). */
export function applyTeamTheme(
  home: TeamIdentity,
  away: TeamIdentity,
  target: HTMLElement | null = typeof document !== 'undefined'
    ? document.documentElement
    : null,
): void {
  if (!target) return;
  target.style.setProperty('--team-home', home.primaryRgb);
  target.style.setProperty('--team-away', away.primaryRgb);
}
