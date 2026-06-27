/**
 * Ball Knowledge — match-timeline event builder (pure).
 *
 * The 0–90' timeline should feel alive: not just goals, but the chances,
 * near misses and saves that make up a match. This turns each revealed
 * question into zero or more timeline marks per side, reusing the same
 * football framing as the result reveal (`attackFraming`) so the two stay
 * in sync. Kept pure + tested; the component only renders what it returns.
 */

import { describeAttack, type AttackPhaseId } from './attackFraming';

export const FULL_TIME = 90;

/** Minimal per-side outcome the timeline needs (a slice of PlayerResult). */
export interface SideOutcome {
  scoredGoal: boolean;
  isCorrect: boolean;
  /** Did the player submit anything (vs run out of time). */
  answered: boolean;
  pointsEarned: number;
  streakBonus: number;
  timeTakenMs: number;
}

/** A single dot on the timeline. */
export interface TimelineMark {
  key: string;
  minute: number;
  side: 'home' | 'away';
  kind: AttackPhaseId;
  /** Human label for title / aria. */
  label: string;
  /** Visual prominence: goals are loud, chances quiet. */
  weight: 'goal' | 'chance' | 'miss';
}

/** Which phases earn a marker — plain attacks/turnovers would just be clutter. */
const WEIGHT: Partial<Record<AttackPhaseId, TimelineMark['weight']>> = {
  goal: 'goal',
  big_chance: 'chance',
  woodwork: 'miss',
  shot_saved: 'miss',
};

const PHASE_LABEL: Record<AttackPhaseId, string> = {
  goal: 'Goal',
  big_chance: 'Big chance',
  good_attack: 'Good attack',
  half_chance: 'Half chance',
  woodwork: 'Off the woodwork',
  shot_saved: 'Shot saved',
  turnover: 'Turnover',
};

/** Map a question index (1-based progress) onto a match minute. */
export function minuteForQuestion(
  questionIndex: number,
  totalQuestions: number,
): number {
  const total = totalQuestions > 0 ? totalQuestions : 1;
  return Math.round(((questionIndex + 1) / total) * FULL_TIME);
}

/**
 * Build the timeline marks for one revealed question. Returns at most one mark
 * per side (goal / big chance / near miss / save); plain attacks and turnovers
 * are omitted to keep the bar readable.
 */
export function buildQuestionMarks(params: {
  questionId: string;
  minute: number;
  totalTimeMs: number;
  home?: SideOutcome;
  away?: SideOutcome;
}): TimelineMark[] {
  const marks: TimelineMark[] = [];
  const sides: Array<['home' | 'away', SideOutcome | undefined]> = [
    ['home', params.home],
    ['away', params.away],
  ];

  for (const [side, outcome] of sides) {
    if (!outcome) continue;
    const phase = describeAttack({
      scoredGoal: outcome.scoredGoal,
      isCorrect: outcome.isCorrect,
      answered: outcome.answered,
      pointsEarned: outcome.pointsEarned,
      streakBonus: outcome.streakBonus,
      timeTakenMs: outcome.timeTakenMs,
      totalTimeMs: params.totalTimeMs,
      minute: params.minute,
    });
    const weight = WEIGHT[phase.id];
    if (!weight) continue;
    marks.push({
      key: `${params.questionId}-${side}`,
      minute: params.minute,
      side,
      kind: phase.id,
      label: PHASE_LABEL[phase.id],
      weight,
    });
  }

  return marks;
}
