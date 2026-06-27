/**
 * Ball Knowledge — "question as a football attack" framing (pure).
 *
 * The main design goal: every answer should *feel* like a moment in a match,
 * not a row in a quiz. This module maps the concrete outcome of one answer
 * (correct?, how fast?, did it score?, on a streak?, how late in the game?)
 * onto a football "attack phase" — a Big Chance, a Good Attack, a Half Chance,
 * a save, a near miss off the woodwork, a turnover, or a GOAL.
 *
 * It's deliberately deterministic and side-effect free so it can be unit-tested
 * and reused everywhere (result reveal, commentary, timeline). The flavour line
 * is chosen by a `seed` so the same situation reads the same in tests but varies
 * across a match (pass the question index).
 *
 * IMPORTANT: framing is cosmetic. The points → goals conversion in `scoring.ts`
 * stays the single source of truth for the result; nothing here changes who wins.
 */

export type AttackPhaseId =
  | 'goal' //          crossed a goal threshold this question
  | 'big_chance' //    correct AND fast
  | 'good_attack' //   correct at a normal pace
  | 'half_chance' //   correct but slow / at the buzzer
  | 'woodwork' //      near miss (partial-credit guess) — off the woodwork
  | 'shot_saved' //    took a shot (answered) but wrong
  | 'turnover'; //     no answer / lost possession

export type AttackTone = 'goal' | 'good' | 'neutral' | 'bad';

export interface AttackPhase {
  id: AttackPhaseId;
  /** Short uppercase badge label, e.g. "Big Chance". */
  label: string;
  /** One-line football framing of the moment. */
  detail: string;
  tone: AttackTone;
  /** On a hot streak (3+) — drives a "Momentum" accent. */
  momentum: boolean;
  /** Late-game moment (>= 80') — drives "Late Pressure" framing. */
  late: boolean;
}

export interface AttackInput {
  /** Crossed into a new goal threshold on this answer. */
  scoredGoal: boolean;
  /** Counts as correct for streaks/stats (true `isCorrect`). */
  isCorrect: boolean;
  /** Player actually submitted something (vs ran out of time). */
  answered: boolean;
  /** Total points earned this question (partial credit > 0 even if not "correct"). */
  pointsEarned: number;
  /** Streak bonus earned (50 → streak 2, 100 → 3, 150 → 4+). */
  streakBonus: number;
  timeTakenMs: number;
  totalTimeMs: number;
  /** Match minute the answer landed on (0–90+); enables late-game framing. */
  minute?: number;
}

/** Remaining-time fraction at or above which a correct answer is a Big Chance. */
export const BIG_CHANCE_FRACTION = 0.6;
/** Remaining-time fraction at or below which a correct answer is only a Half Chance. */
export const HALF_CHANCE_FRACTION = 0.25;
/** Streak bonus that signals "Momentum" (a 3+ streak earns >= 100). */
export const MOMENTUM_BONUS = 100;
/** Match minute from which moments read as late-game pressure. */
export const LATE_MINUTE = 80;

function remainingFraction(timeTakenMs: number, totalTimeMs: number): number {
  if (totalTimeMs <= 0) return 0;
  const remaining = Math.max(0, totalTimeMs - timeTakenMs);
  return Math.max(0, Math.min(1, remaining / totalTimeMs));
}

function pick(lines: string[], seed: number): string {
  const i = ((Math.trunc(seed) % lines.length) + lines.length) % lines.length;
  return lines[i];
}

const LABELS: Record<AttackPhaseId, string> = {
  goal: 'GOAL',
  big_chance: 'Big Chance',
  good_attack: 'Good Attack',
  half_chance: 'Half Chance',
  woodwork: 'Off the Woodwork',
  shot_saved: 'Shot Saved',
  turnover: 'Turnover',
};

const TONES: Record<AttackPhaseId, AttackTone> = {
  goal: 'goal',
  big_chance: 'good',
  good_attack: 'good',
  half_chance: 'neutral',
  woodwork: 'neutral',
  shot_saved: 'bad',
  turnover: 'bad',
};

const DETAILS: Record<AttackPhaseId, string[]> = {
  goal: [
    'The net ripples — that one counts!',
    'Clinical. Knowledge turned into a goal.',
    'It’s in! A finish to settle the nerves.',
  ],
  big_chance: [
    'Brilliant through ball — a big chance carved open!',
    'No hesitation — that split the defence wide open.',
    'Sharp and certain. A gilt-edged opening.',
  ],
  good_attack: [
    'A patient build-up pays off.',
    'Good football — they work it into a chance.',
    'Composed in possession, and it tells.',
  ],
  half_chance: [
    'Got there in the end — a half-chance, but it counts.',
    'Cut it fine at the buzzer, but they take it.',
    'Under pressure, they just about find a way.',
  ],
  woodwork: [
    'Off the woodwork — agonisingly close!',
    'VAR checks it… narrowly wide. So nearly.',
    'Rattles the bar — inches from a perfect strike.',
  ],
  shot_saved: [
    'Shot saved — the keeper stands tall.',
    'Wayward effort — the chance goes begging.',
    'Blazed over. That one could matter later.',
  ],
  turnover: [
    'Possession surrendered — a costly turnover.',
    'Caught dawdling — they lose the ball.',
    'No answer, and the move breaks down.',
  ],
};

const MOMENTUM_SUFFIX = ' They’re building real momentum.';
const LATE_SUFFIX = ' Late pressure — every moment matters now.';

/**
 * Map one answer outcome onto a football attack phase. Precedence:
 * goal > correct (graded by speed) > near-miss woodwork > shot saved > turnover.
 */
export function describeAttack(input: AttackInput, seed = 0): AttackPhase {
  const momentum = input.streakBonus >= MOMENTUM_BONUS;
  const late = (input.minute ?? 0) >= LATE_MINUTE;

  let id: AttackPhaseId;
  if (input.scoredGoal) {
    id = 'goal';
  } else if (input.isCorrect) {
    const frac = remainingFraction(input.timeTakenMs, input.totalTimeMs);
    if (frac >= BIG_CHANCE_FRACTION) id = 'big_chance';
    else if (frac <= HALF_CHANCE_FRACTION) id = 'half_chance';
    else id = 'good_attack';
  } else if (input.pointsEarned > 0) {
    // Partial credit without crossing the "correct" bar = a near miss.
    id = 'woodwork';
  } else if (input.answered) {
    id = 'shot_saved';
  } else {
    id = 'turnover';
  }

  let detail = pick(DETAILS[id], seed);
  // Accent the framing for positive moments only — a turnover isn't "momentum".
  if (momentum && (id === 'goal' || id === 'big_chance' || id === 'good_attack')) {
    detail += MOMENTUM_SUFFIX;
  } else if (late && (TONES[id] === 'good' || TONES[id] === 'goal')) {
    detail += LATE_SUFFIX;
  }

  return { id, label: LABELS[id], detail, tone: TONES[id], momentum, late };
}
