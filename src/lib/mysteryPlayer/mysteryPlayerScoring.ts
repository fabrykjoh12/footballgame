/**
 * Mystery Player Duel — match-format scoring (pure).
 */

import type { MatchFormat } from './mysteryPlayerTypes';

/** Round wins needed to take the match. */
export function roundsToWin(format: MatchFormat): number {
  switch (format) {
    case 'bo3':
      return 2;
    case 'bo5':
      return 3;
    case 'single':
    default:
      return 1;
  }
}

/** The match winner id given the score, or null if undecided. */
export function matchWinner(
  score: Record<string, number>,
  format: MatchFormat,
): string | null {
  const need = roundsToWin(format);
  for (const [id, wins] of Object.entries(score)) {
    if (wins >= need) return id;
  }
  return null;
}
