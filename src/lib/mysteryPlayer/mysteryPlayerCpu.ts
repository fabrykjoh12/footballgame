/**
 * Mystery Player Duel — a simple but functional CPU (pure, seeded).
 *
 * The CPU picks a secret, asks the verified question that best splits its
 * remaining candidates (max information), and guesses once it's confident.
 * It can't parse free text, so it answers free questions "unsure".
 */

import { MYSTERY_PLAYERS, mysteryPlayerById } from '../../data/mysteryPlayers';
import {
  answerVerified,
  CONTINENT_OPTIONS,
  ERA_OPTIONS,
  LEAGUE_OPTIONS,
  POSITION_OPTIONS,
  STATUS_OPTIONS,
  TROPHY_OPTIONS,
} from './mysteryPlayerQuestions';
import { currentCandidates } from './mysteryPlayerEngine';
import type { FreeAnswer, MysteryState, VerifiedQuestion } from './mysteryPlayerTypes';
import type { Rng } from '../seededRandom';

export type CpuAction =
  | { type: 'verified'; question: VerifiedQuestion }
  | { type: 'guess'; guessId: string };

const qKey = (q: VerifiedQuestion) => `${q.kind}:${q.value}`;

/** Pick a random secret player for the CPU. */
export function cpuChoosePlayer(rng: Rng): string {
  return MYSTERY_PLAYERS[Math.floor(rng() * MYSTERY_PLAYERS.length)].id;
}

/** The CPU's answer to a free (manual) question — it can't read intent. */
export function cpuAnswerFree(): FreeAnswer {
  return 'unsure';
}

/** The CPU answers a manual verified question truthfully from its own secret. */
export function cpuAnswerVerified(secretId: string, question: VerifiedQuestion): FreeAnswer {
  const secret = mysteryPlayerById(secretId);
  if (!secret) return 'unsure';
  return answerVerified(secret, question) ? 'yes' : 'no';
}

function candidateQuestionPool(candidates: { nationality: string }[]): VerifiedQuestion[] {
  const countries = [...new Set(candidates.map((c) => c.nationality))];
  return [
    ...LEAGUE_OPTIONS.map((value) => ({ kind: 'league', value }) as VerifiedQuestion),
    ...POSITION_OPTIONS.map((value) => ({ kind: 'position', value }) as VerifiedQuestion),
    ...TROPHY_OPTIONS.map((value) => ({ kind: 'trophy', value }) as VerifiedQuestion),
    ...STATUS_OPTIONS.map((value) => ({ kind: 'status', value }) as VerifiedQuestion),
    ...ERA_OPTIONS.map((value) => ({ kind: 'era', value }) as VerifiedQuestion),
    ...CONTINENT_OPTIONS.map((value) => ({ kind: 'continent', value }) as VerifiedQuestion),
    ...countries.map((value) => ({ kind: 'country', value }) as VerifiedQuestion),
  ];
}

/**
 * Decide the CPU's action on its turn: guess when down to one candidate (or by
 * a confidence roll at two), else ask the most balanced unused question.
 */
export function cpuTakeTurn(state: MysteryState, cpuId: string, rng: Rng): CpuAction {
  const candidates = currentCandidates(state, cpuId);
  const pickGuess = (): CpuAction => {
    const pool = candidates.length > 0 ? candidates : MYSTERY_PLAYERS;
    return { type: 'guess', guessId: pool[Math.floor(rng() * pool.length)].id };
  };

  if (candidates.length <= 1) return pickGuess();
  // A little daring: sometimes guess with two left.
  if (candidates.length === 2 && rng() < 0.5) return pickGuess();

  const asked = new Set((state.knowledge[cpuId] ?? []).map((f) => qKey(f.question)));
  const half = candidates.length / 2;
  let best: VerifiedQuestion | null = null;
  let bestScore = Infinity;

  for (const q of candidateQuestionPool(candidates)) {
    if (asked.has(qKey(q))) continue;
    const yes = candidates.filter((p) => answerVerified(p, q)).length;
    if (yes === 0 || yes === candidates.length) continue; // no information
    const score = Math.abs(yes - half);
    if (score < bestScore) {
      bestScore = score;
      best = q;
    }
  }

  return best ? { type: 'verified', question: best } : pickGuess();
}
