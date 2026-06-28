/**
 * Per-question insight comparing your answer with the opponent's — a small
 * "you were 1.4s faster than Jonas" line for the result reveal. Pure + tested.
 */

export interface AnswerSide {
  correct: boolean;
  /** Did they actually answer (vs time out). */
  answered: boolean;
  timeTakenMs: number;
}

/** Significant speed gap (ms) before we call one side "faster". */
export const SPEED_GAP_MS = 300;

const secs = (ms: number) => `${Math.max(0, ms / 1000).toFixed(1)}s`;

/**
 * A short comparison of your answer vs the opponent's, from your perspective.
 * Returns null when there's nothing worth saying (e.g. both missed it).
 */
export function speedComparison(
  you: AnswerSide,
  opp: AnswerSide,
  oppName: string,
): string | null {
  // Both correct → compare speed.
  if (you.correct && opp.correct) {
    const delta = opp.timeTakenMs - you.timeTakenMs;
    if (delta >= SPEED_GAP_MS) return `You answered ${secs(delta)} faster than ${oppName}.`;
    if (-delta >= SPEED_GAP_MS) return `${oppName} answered ${secs(-delta)} faster than you.`;
    return `Neck and neck — within ${secs(Math.abs(delta))} of ${oppName}.`;
  }
  if (you.correct && !opp.correct) {
    return opp.answered ? `You got it — ${oppName} guessed wrong.` : `You got it — ${oppName} ran out of time.`;
  }
  if (!you.correct && opp.correct) {
    return `${oppName} got it — you didn’t this time.`;
  }
  return null; // both wrong: nothing to crow about
}
