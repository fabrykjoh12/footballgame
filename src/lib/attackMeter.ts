/**
 * Ball Knowledge — the live "attack meter" (pure).
 *
 * The scoreboard shows raw points and the football score, but the *journey*
 * between goals was invisible — a player could be one good answer from scoring
 * and never feel it. This maps a running point total onto visible football
 * momentum: how full the current attack is, and what phase it's in
 * (possession → building pressure → dangerous attack → shooting chance).
 *
 * It is deliberately a pure view over `scoring.ts`: the fill is exactly the
 * progress toward the next 2,500-point goal, so the meter can NEVER disagree
 * with the scoreline. Streak only tints the feel (a `surging` flag), never the
 * fill — momentum affects presentation, not who scores.
 */
import { POINTS_PER_GOAL, MAX_GOALS, calculateGoalsFromPoints } from './scoring';

export type AttackPhaseId = 'possession' | 'pressure' | 'dangerous' | 'shot' | 'max';

export interface AttackMeterState {
  /** Progress toward the next goal, 0–1 (1 when the goal cap is reached). */
  fill: number;
  phase: AttackPhaseId;
  /** Short broadcast label for the phase. */
  label: string;
  /** Points still needed to convert the current attack into a goal (0 at cap). */
  pointsToGoal: number;
  /** Point-derived goals so far (0–5). */
  goals: number;
  /** On a hot streak (3+) — tints the meter, does not change the fill. */
  surging: boolean;
  /** The goal cap has been reached; the attack can't add more goals. */
  maxed: boolean;
}

/** Fraction thresholds where the attack steps up a phase. */
export const PRESSURE_AT = 0.3;
export const DANGEROUS_AT = 0.6;
export const SHOT_AT = 0.9;
/** Streak length that reads as "surging". */
export const SURGE_STREAK = 3;

const LABELS: Record<AttackPhaseId, string> = {
  possession: 'Possession',
  pressure: 'Building pressure',
  dangerous: 'Dangerous attack',
  shot: 'Shooting chance',
  max: 'Full pressure',
};

/** Derive the live attack state from a player's running score + streak. */
export function attackState(score: number, streak = 0): AttackMeterState {
  const goals = calculateGoalsFromPoints(score);
  const maxed = goals >= MAX_GOALS;

  const into = maxed ? 0 : ((score % POINTS_PER_GOAL) + POINTS_PER_GOAL) % POINTS_PER_GOAL;
  const fill = maxed ? 1 : into / POINTS_PER_GOAL;
  const pointsToGoal = maxed ? 0 : POINTS_PER_GOAL - into;

  let phase: AttackPhaseId;
  if (maxed) phase = 'max';
  else if (fill >= SHOT_AT) phase = 'shot';
  else if (fill >= DANGEROUS_AT) phase = 'dangerous';
  else if (fill >= PRESSURE_AT) phase = 'pressure';
  else phase = 'possession';

  return {
    fill,
    phase,
    label: LABELS[phase],
    pointsToGoal,
    goals,
    surging: streak >= SURGE_STREAK && !maxed,
    maxed,
  };
}
