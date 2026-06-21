/**
 * Simulated opponent for local / demo mode.
 *
 * The bot decides, per question, whether it answers correctly and how long
 * it "thinks". Accuracy scales with the question difficulty so Casual feels
 * winnable and Nightmare feels brutal even against the CPU.
 */

import type { Difficulty, Question, SubmitAnswerInput } from '../types/game';

const ACCURACY_BY_DIFFICULTY: Record<Difficulty, number> = {
  easy: 0.82,
  medium: 0.66,
  hard: 0.5,
  nightmare: 0.36,
};

const MIN_THINK_MS = 1800;
/** Keep a little buffer before the buzzer so the bot rarely times out. */
const END_BUFFER_MS = 1200;

function randBetween(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min));
}

function wrongOption(question: Question): string | null {
  if (question.type === 'higher_lower') {
    return question.correctAnswer === question.leftOption.name
      ? question.rightOption.name
      : question.leftOption.name;
  }
  const wrong = question.options.filter((o) => o !== question.correctAnswer);
  if (wrong.length === 0) return null;
  return wrong[Math.floor(Math.random() * wrong.length)];
}

export interface BotDecision extends SubmitAnswerInput {
  /** When (ms after question start) the bot should submit. */
  delayMs: number;
}

export function decideBotAnswer(
  question: Question,
  totalTimeMs: number,
): BotDecision {
  const accuracy = ACCURACY_BY_DIFFICULTY[question.difficulty] ?? 0.5;
  const willBeCorrect = Math.random() < accuracy;

  const maxThink = Math.max(MIN_THINK_MS + 500, totalTimeMs - END_BUFFER_MS);
  const delayMs = randBetween(MIN_THINK_MS, maxThink);

  const clueStage =
    question.type === 'who_am_i'
      ? Math.min(Math.floor(delayMs / 5000), question.clues.length - 1)
      : 0;

  const selectedAnswer = willBeCorrect
    ? question.correctAnswer
    : wrongOption(question);

  return { selectedAnswer, clueStage, timeTakenMs: delayMs, delayMs };
}
