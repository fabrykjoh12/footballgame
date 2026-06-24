import { describe, it, expect } from 'vitest';
import {
  goalsFor,
  resolveQuestion,
  tallyScoreline,
  isLevel,
  winnerFromScoreline,
  questionToMinute,
  GOAL_QUALITY_THRESHOLD,
  BRACE_QUALITY_THRESHOLD,
} from './scoring.ts';
import type { AnswerOutcome, QuestionResult } from '../types/match.ts';

const outcome = (
  correct: boolean,
  quality: number,
  elapsedMs = 1000,
): AnswerOutcome => ({ correct, quality, elapsedMs });

describe('goalsFor', () => {
  it('wrong answers never score', () => {
    expect(goalsFor(outcome(false, 1))).toBe(0);
  });
  it('low-quality correct answers are saved', () => {
    expect(goalsFor(outcome(true, GOAL_QUALITY_THRESHOLD - 0.01))).toBe(0);
  });
  it('correct above threshold scores one', () => {
    expect(goalsFor(outcome(true, GOAL_QUALITY_THRESHOLD))).toBe(1);
  });
  it('exceptional quality scores a brace', () => {
    expect(goalsFor(outcome(true, BRACE_QUALITY_THRESHOLD))).toBe(2);
  });
});

describe('resolveQuestion', () => {
  it('computes goals for both sides', () => {
    const r = resolveQuestion(
      0,
      'multiple_choice',
      outcome(true, 0.8),
      outcome(false, 0),
    );
    expect(r.playerGoals).toBe(1);
    expect(r.opponentGoals).toBe(0);
  });
});

describe('tallyScoreline', () => {
  const mk = (pg: number, og: number): QuestionResult => ({
    index: 0,
    miniGame: 'true_false',
    player: outcome(pg > 0, 1),
    opponent: outcome(og > 0, 1),
    playerGoals: pg,
    opponentGoals: og,
  });

  it('maps player goals to the correct side (home)', () => {
    const score = tallyScoreline([mk(2, 1), mk(1, 0)], 'home');
    expect(score).toEqual({ home: 3, away: 1 });
  });

  it('maps player goals to the correct side (away)', () => {
    const score = tallyScoreline([mk(2, 1), mk(1, 0)], 'away');
    expect(score).toEqual({ home: 1, away: 3 });
  });
});

describe('isLevel / winnerFromScoreline', () => {
  it('detects level scores', () => {
    expect(isLevel({ home: 2, away: 2 })).toBe(true);
    expect(isLevel({ home: 3, away: 2 })).toBe(false);
  });
  it('picks the winner', () => {
    expect(winnerFromScoreline({ home: 3, away: 1 })).toBe('home');
    expect(winnerFromScoreline({ home: 0, away: 2 })).toBe('away');
    expect(winnerFromScoreline({ home: 1, away: 1 })).toBe('draw');
  });
});

describe('questionToMinute', () => {
  it('maps first and last questions across the match', () => {
    expect(questionToMinute(0, 10)).toBeLessThanOrEqual(10);
    expect(questionToMinute(9, 10)).toBe(90);
  });
  it('is monotonic non-decreasing', () => {
    let prev = 0;
    for (let i = 0; i < 10; i++) {
      const m = questionToMinute(i, 10);
      expect(m).toBeGreaterThanOrEqual(prev);
      prev = m;
    }
  });
});
