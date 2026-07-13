import { describe, it, expect } from 'vitest';
import {
  validAnswersForQuestion,
  validateAnswerInput,
  LATENCY_GRACE_MS,
} from './answerValidation';
import type { Question, SubmitAnswerInput } from '../types/game';

const mc: Question = {
  id: 'mc',
  type: 'club_country',
  difficulty: 'easy',
  category: 'clubs',
  prompt: '?',
  options: ['a', 'b', 'c', 'd'],
  correctAnswer: 'a',
  explanation: '',
};

const hl: Question = {
  id: 'hl',
  type: 'higher_lower',
  difficulty: 'easy',
  category: 'players',
  prompt: 'more?',
  leftOption: { name: 'L', value: 10 },
  rightOption: { name: 'R', value: 2 },
  correctAnswer: 'L',
  explanation: '',
};

const num: Question = {
  id: 'num',
  type: 'guess_the_number',
  difficulty: 'easy',
  category: 'players',
  prompt: 'how many?',
  correctAnswer: '50',
  min: 0,
  max: 100,
  explanation: '',
};

const DURATION = 10_000;
const input = (over: Partial<SubmitAnswerInput>): SubmitAnswerInput => ({
  selectedAnswer: 'a',
  clueStage: 0,
  timeTakenMs: 1000,
  ...over,
});
const ctx = (over: Partial<{ questionStartedAt: number | null; now: number }> = {}) => ({
  questionStartedAt: 0,
  questionDurationMs: DURATION,
  now: 1000,
  ...over,
});

describe('validAnswersForQuestion', () => {
  it('returns the options for multiple-choice types', () => {
    expect(validAnswersForQuestion(mc)).toEqual(['a', 'b', 'c', 'd']);
  });
  it('returns both side names for higher_lower', () => {
    expect(validAnswersForQuestion(hl)).toEqual(['L', 'R']);
  });
  it('returns null for guess_the_number (validated numerically)', () => {
    expect(validAnswersForQuestion(num)).toBeNull();
  });
});

describe('validateAnswerInput — answer legality', () => {
  it('accepts a valid option and keeps it', () => {
    const r = validateAnswerInput(mc, input({ selectedAnswer: 'c' }), ctx());
    expect(r.selectedAnswer).toBe('c');
    expect(r.timedOut).toBe(false);
  });

  it('rejects an option that is not on the question (treated as timeout)', () => {
    const r = validateAnswerInput(mc, input({ selectedAnswer: 'z' }), ctx());
    expect(r.selectedAnswer).toBeNull();
    expect(r.timedOut).toBe(true);
  });

  it('accepts a valid higher_lower side, rejects a spoofed one', () => {
    expect(validateAnswerInput(hl, input({ selectedAnswer: 'R' }), ctx()).selectedAnswer).toBe('R');
    expect(validateAnswerInput(hl, input({ selectedAnswer: 'X' }), ctx()).selectedAnswer).toBeNull();
  });

  it('treats a null selection as a timeout', () => {
    const r = validateAnswerInput(mc, input({ selectedAnswer: null }), ctx());
    expect(r.selectedAnswer).toBeNull();
    expect(r.timedOut).toBe(true);
    expect(r.timeTakenMs).toBe(DURATION);
  });
});

describe('validateAnswerInput — guess_the_number', () => {
  it('clamps a number into the slider range', () => {
    expect(validateAnswerInput(num, input({ selectedAnswer: '250' }), ctx()).selectedAnswer).toBe('100');
    expect(validateAnswerInput(num, input({ selectedAnswer: '-5' }), ctx()).selectedAnswer).toBe('0');
  });
  it('keeps an in-range number', () => {
    expect(validateAnswerInput(num, input({ selectedAnswer: '42' }), ctx()).selectedAnswer).toBe('42');
  });
  it('rejects a non-numeric guess', () => {
    const r = validateAnswerInput(num, input({ selectedAnswer: 'lots' }), ctx());
    expect(r.selectedAnswer).toBeNull();
    expect(r.timedOut).toBe(true);
  });
});

describe('validateAnswerInput — timing', () => {
  it('never returns a negative or over-duration time', () => {
    expect(validateAnswerInput(mc, input({ timeTakenMs: -500 }), ctx()).timeTakenMs).toBe(0);
    expect(validateAnswerInput(mc, input({ timeTakenMs: 99_999 }), ctx()).timeTakenMs).toBe(DURATION);
  });

  it('floors an implausibly-fast claim to the host-elapsed time (anti speed-cheat)', () => {
    // Host saw 5s elapse; a client claiming 1ms is floored (minus a latency grace).
    const r = validateAnswerInput(mc, input({ timeTakenMs: 1 }), ctx({ now: 5000 }));
    expect(r.timeTakenMs).toBe(5000 - LATENCY_GRACE_MS);
  });

  it('leaves an honest claim untouched within the latency grace', () => {
    // Host saw ~1s; client claims 1000ms → unchanged.
    const r = validateAnswerInput(mc, input({ timeTakenMs: 1000 }), ctx({ now: 1000 }));
    expect(r.timeTakenMs).toBe(1000);
  });

  it('treats an answer well past the deadline as a timeout', () => {
    const r = validateAnswerInput(mc, input({}), ctx({ now: DURATION + 5000 }));
    expect(r.timedOut).toBe(true);
    expect(r.selectedAnswer).toBeNull();
  });

  it('falls back to clamping the client time when the start is unknown (local)', () => {
    const r = validateAnswerInput(mc, input({ timeTakenMs: 3000 }), ctx({ questionStartedAt: null }));
    expect(r.timeTakenMs).toBe(3000);
    expect(r.selectedAnswer).toBe('a');
  });
});
