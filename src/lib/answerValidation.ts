/**
 * Host-side answer sanitisation.
 *
 * In multiplayer, guests send their answer input to the host, which runs the
 * authoritative engine. A guest's client can lie: claim an impossibly fast
 * answer to farm the speed bonus, submit an option that isn't on the question,
 * or answer after the deadline. This module clamps and validates that input
 * BEFORE the engine scores it.
 *
 * It is deliberately forgiving for casual play — a latency grace window absorbs
 * normal network round-trips so a real guest is never penalised for lag. It is
 * NOT a substitute for server-side validation on a competitive/ranked ladder
 * (see README "Pre-launch checklist"): the host is still trusted.
 */

import type { Question, SubmitAnswerInput } from '../types/game';

/** How much a client may under-report answer time vs the host clock (latency). */
export const LATENCY_GRACE_MS = 1500;
/** How long after the deadline a straggler answer is still accepted. */
export const LATE_GRACE_MS = 1500;

export interface AnswerTimingContext {
  /** Epoch ms the question went live (host clock), or null if unknown. */
  questionStartedAt: number | null;
  /** The question's time budget in ms. */
  questionDurationMs: number;
  /** Host-side receive time (epoch ms). */
  now: number;
}

export interface ValidatedAnswer {
  /** Sanitised answer, or null when it was a timeout / rejected as invalid. */
  selectedAnswer: string | null;
  /** Clamped time taken in ms, always within [0, questionDurationMs]. */
  timeTakenMs: number;
  /** True when treated as no-credit (late, missing, or invalid selection). */
  timedOut: boolean;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(Math.max(v, lo), hi);
}

/**
 * The exact set of legal answer strings for a question, or `null` for
 * `guess_the_number` (which is validated numerically against min/max instead).
 */
export function validAnswersForQuestion(question: Question): string[] | null {
  switch (question.type) {
    case 'higher_lower':
      return [question.leftOption.name, question.rightOption.name];
    case 'guess_the_number':
      return null;
    default:
      return question.options;
  }
}

/**
 * Sanitise a submitted answer against the question and the host's own clock.
 * Returns a value the engine can score directly.
 */
export function validateAnswerInput(
  question: Question,
  input: SubmitAnswerInput,
  ctx: AnswerTimingContext,
): ValidatedAnswer {
  const duration = ctx.questionDurationMs;
  const timeout: ValidatedAnswer = {
    selectedAnswer: null,
    timeTakenMs: duration,
    timedOut: true,
  };

  // --- Timing: derive a trustworthy time-taken from the host clock. ---
  let pastDeadline = false;
  let timeTakenMs: number;
  const client = Number.isFinite(input.timeTakenMs) ? input.timeTakenMs : duration;
  if (ctx.questionStartedAt != null) {
    const hostElapsed = ctx.now - ctx.questionStartedAt;
    if (hostElapsed > duration + LATE_GRACE_MS) pastDeadline = true;
    // A client can't have answered faster than the host saw it (minus latency),
    // so floor the claimed time. Over-reporting only costs them points, so the
    // upper bound is just the question duration.
    const floor = clamp(hostElapsed - LATENCY_GRACE_MS, 0, duration);
    timeTakenMs = clamp(client, floor, duration);
  } else {
    timeTakenMs = clamp(client, 0, duration);
  }

  if (pastDeadline) return timeout;
  if (input.selectedAnswer == null) return timeout;

  // --- Answer value: must be legal for the question type. ---
  if (question.type === 'guess_the_number') {
    const n = Number(input.selectedAnswer);
    if (!Number.isFinite(n)) return timeout;
    return {
      selectedAnswer: String(clamp(n, question.min, question.max)),
      timeTakenMs,
      timedOut: false,
    };
  }

  const valid = validAnswersForQuestion(question);
  if (valid && !valid.includes(input.selectedAnswer)) return timeout;

  return { selectedAnswer: input.selectedAnswer, timeTakenMs, timedOut: false };
}
