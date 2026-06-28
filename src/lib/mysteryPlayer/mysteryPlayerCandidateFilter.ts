/**
 * Mystery Player Duel — candidate filtering (pure).
 *
 * Given the verified facts a player has learned about their opponent, narrow the
 * pool to the players still consistent with every answer. Only verified facts
 * filter; free questions never auto-filter.
 */

import { answerVerified } from './mysteryPlayerQuestions';
import type { MysteryPlayer, VerifiedFact } from './mysteryPlayerTypes';

/** Players from `pool` consistent with every verified fact learned so far. */
export function filterCandidates(
  pool: MysteryPlayer[],
  facts: VerifiedFact[],
): MysteryPlayer[] {
  if (facts.length === 0) return [...pool];
  return pool.filter((p) => facts.every((f) => answerVerified(p, f.question) === f.answer));
}

export function candidateCount(pool: MysteryPlayer[], facts: VerifiedFact[]): number {
  return filterCandidates(pool, facts).length;
}
