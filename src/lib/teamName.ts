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
  // A multi-word name is already a full club name (a created club identity, a
  // named rival, etc.) — use it verbatim. Only single-word handles ("Sara")
  // get a deterministic club suffix appended.
  if (/\s/.test(name)) return name;
  const suffix = SUFFIXES[hash(name) % SUFFIXES.length];
  return `${name} ${suffix}`;
}
