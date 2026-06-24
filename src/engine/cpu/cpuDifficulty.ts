/**
 * CPU difficulty model.
 *
 * Turns a difficulty level into the parameters that shape the simulated
 * opponent: how accurate it is, how good its "finishing" (answer quality) is,
 * and how long it takes to respond. All draws go through the seeded RNG so a
 * CPU match is reproducible.
 */

import type { AnswerOutcome, Difficulty } from '../../types/match.ts';
import type { Rng } from '../../lib/rng.ts';

export interface CpuProfile {
  /** Probability the CPU answers correctly. */
  accuracy: number;
  /** Mean answer quality (0..1) when correct — drives goal conversion. */
  qualityMean: number;
  /** Response time window in ms [min, max]. */
  responseMs: [number, number];
}

export const CPU_PROFILES: Record<Difficulty, CpuProfile> = {
  casual: { accuracy: 0.45, qualityMean: 0.45, responseMs: [1200, 4200] },
  pro: { accuracy: 0.65, qualityMean: 0.6, responseMs: [900, 3200] },
  legend: { accuracy: 0.82, qualityMean: 0.74, responseMs: [600, 2200] },
};

/** Produce a simulated CPU outcome for one question. */
export function simulateCpuOutcome(
  difficulty: Difficulty,
  rng: Rng,
): AnswerOutcome {
  const profile = CPU_PROFILES[difficulty];
  const correct = rng.chance(profile.accuracy);
  const [minMs, maxMs] = profile.responseMs;
  const elapsedMs = rng.int(minMs, maxMs);

  if (!correct) {
    return { correct: false, quality: 0, elapsedMs };
  }
  // Quality jitters around the profile mean, clamped to [0, 1].
  const jitter = (rng.next() - 0.5) * 0.5;
  const quality = Math.max(0, Math.min(1, profile.qualityMean + jitter));
  return { correct: true, quality, elapsedMs };
}

/** How long (ms) before the CPU "answers" — used to schedule its response. */
export function cpuResponseDelay(difficulty: Difficulty, rng: Rng): number {
  const [minMs, maxMs] = CPU_PROFILES[difficulty].responseMs;
  return rng.int(minMs, maxMs);
}
