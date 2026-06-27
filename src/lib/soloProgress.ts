/**
 * Local best-scores for the singleplayer arcade modes. Purely local (a device
 * leaderboard); the pure update rule is unit-tested.
 */

import type { SoloMode } from './soloModes';

const KEY = 'bk_solo_v1';

export interface SoloProgress {
  /** Survival: longest run (questions survived). */
  survivalBest: number;
  /** Time Attack: best points banked in a run. */
  timeAttackBest: number;
  /** Gauntlet: best points total. */
  gauntletBest: number;
  /** Gauntlet: ever cleared all 10 correctly. */
  gauntletPerfect: boolean;
  soloPlays: number;
}

const EMPTY: SoloProgress = {
  survivalBest: 0,
  timeAttackBest: 0,
  gauntletBest: 0,
  gauntletPerfect: false,
  soloPlays: 0,
};

export interface SoloRunResult {
  mode: SoloMode;
  /** Total points banked. */
  score: number;
  /** Questions survived / answered correctly (Survival uses this as its best). */
  survived: number;
  /** Gauntlet: cleared all questions correctly. */
  perfect?: boolean;
}

/** Pure: fold a finished run into the stored progress, keeping the best. */
export function applySoloResult(prev: SoloProgress, run: SoloRunResult): SoloProgress {
  const next: SoloProgress = { ...prev, soloPlays: prev.soloPlays + 1 };
  if (run.mode === 'survival') next.survivalBest = Math.max(prev.survivalBest, run.survived);
  else if (run.mode === 'time_attack') next.timeAttackBest = Math.max(prev.timeAttackBest, run.score);
  else if (run.mode === 'gauntlet') {
    next.gauntletBest = Math.max(prev.gauntletBest, run.score);
    if (run.perfect) next.gauntletPerfect = true;
  }
  return next;
}

/** The personal-best metric for a mode (Survival = runs survived, else points). */
export function bestForMode(p: SoloProgress, mode: SoloMode): number {
  if (mode === 'survival') return p.survivalBest;
  if (mode === 'time_attack') return p.timeAttackBest;
  return p.gauntletBest;
}

export function getSoloProgress(): SoloProgress {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...EMPTY, ...(JSON.parse(raw) as SoloProgress) } : { ...EMPTY };
  } catch {
    return { ...EMPTY };
  }
}

/** Record a finished run and return the updated progress (and whether it's a new best). */
export function recordSoloResult(run: SoloRunResult): { progress: SoloProgress; isBest: boolean } {
  const prev = getSoloProgress();
  const prevBest = bestForMode(prev, run.mode);
  const progress = applySoloResult(prev, run);
  const metric = run.mode === 'survival' ? run.survived : run.score;
  const isBest = metric > prevBest && metric > 0;
  try {
    localStorage.setItem(KEY, JSON.stringify(progress));
  } catch {
    /* storage unavailable */
  }
  return { progress, isBest };
}
