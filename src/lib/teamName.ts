/**
 * Turns a player's name into a stable football "club" name, e.g.
 * "Sara" → "Sara FC", "Jonas" → "Jonas United". Deterministic per name so a
 * player keeps the same club within and across matches.
 */

const SUFFIXES = [
  'FC',
  'United',
  'City',
  'Athletic',
  'Rovers',
  'Town',
  'Albion',
  'Wanderers',
  'Hotspur',
  'Galaxy',
];

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function teamName(playerName: string): string {
  const name = (playerName || 'Player').trim();
  const suffix = SUFFIXES[hash(name) % SUFFIXES.length];
  return `${name} ${suffix}`;
}
