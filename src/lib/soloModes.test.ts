import { describe, it, expect } from 'vitest';
import { pickSoloQuestions, gradeSoloAnswer, clueStageForElapsed, SOLO_MODE_LIST } from './soloModes';
import type { Question } from '../types/game';

describe('SOLO_MODE_LIST', () => {
  it('has the three arcade modes with unique ids', () => {
    const ids = SOLO_MODE_LIST.map((m) => m.id);
    expect(ids).toEqual(['survival', 'time_attack', 'gauntlet']);
  });
});

describe('pickSoloQuestions: gauntlet', () => {
  it('returns one question per type, with a difficulty that climbs', () => {
    const qs = pickSoloQuestions('gauntlet');
    expect(qs).toHaveLength(10);
    expect(new Set(qs.map((q) => q.type)).size).toBe(10); // one of each type
    // The first question should be no harder than the last (easy → nightmare ramp).
    const order = ['easy', 'medium', 'hard', 'nightmare'];
    expect(order.indexOf(qs[0].difficulty)).toBeLessThanOrEqual(order.indexOf(qs[9].difficulty));
    expect(new Set(qs.map((q) => q.id)).size).toBe(10); // all distinct
  });
});

describe('pickSoloQuestions: survival', () => {
  it('bands the run by difficulty, easy first and nightmare last', () => {
    const qs = pickSoloQuestions('survival');
    expect(qs.length).toBeGreaterThan(20);
    const order = ['easy', 'medium', 'hard', 'nightmare'];
    const ranks = qs.map((q) => order.indexOf(q.difficulty));
    // Non-decreasing difficulty across the banded run.
    for (let i = 1; i < ranks.length; i++) {
      expect(ranks[i]).toBeGreaterThanOrEqual(ranks[i - 1]);
    }
    expect(qs[0].difficulty).toBe('easy');
  });
});

describe('pickSoloQuestions: time_attack', () => {
  it('builds a quickfire list (no per-type or length constraint that breaks)', () => {
    const qs = pickSoloQuestions('time_attack');
    expect(qs.length).toBeGreaterThan(10);
    expect(new Set(qs.map((q) => q.id)).size).toBe(qs.length); // no duplicates
  });
});

const mc: Question = {
  id: 'x',
  type: 'club_country',
  difficulty: 'easy',
  category: 'clubs',
  prompt: 'p',
  options: ['a', 'b', 'c', 'd'],
  correctAnswer: 'a',
  explanation: '',
};

describe('gradeSoloAnswer', () => {
  it('scores a correct MC answer and bumps the streak', () => {
    const g = gradeSoloAnswer(mc, 'a', 0, 2000, 12000, 1);
    expect(g.isCorrect).toBe(true);
    expect(g.newStreak).toBe(2);
    expect(g.breakdown.total).toBeGreaterThan(0);
  });

  it('resets the streak on a wrong answer with zero points', () => {
    const g = gradeSoloAnswer(mc, 'b', 0, 2000, 12000, 3);
    expect(g.isCorrect).toBe(false);
    expect(g.newStreak).toBe(0);
    expect(g.breakdown.total).toBe(0);
  });

  it('treats a timeout (null) as wrong', () => {
    const g = gradeSoloAnswer(mc, null, 0, 12000, 12000, 5);
    expect(g.isCorrect).toBe(false);
    expect(g.newStreak).toBe(0);
  });

  it('gives partial credit on a close guess_the_number', () => {
    const gtn: Question = {
      id: 'n',
      type: 'guess_the_number',
      difficulty: 'medium',
      category: 'players',
      prompt: 'how many?',
      correctAnswer: '100',
      min: 0,
      max: 200,
    };
    const close = gradeSoloAnswer(gtn, '95', 0, 1000, 12000, 0); // 5% off → counts correct
    expect(close.isCorrect).toBe(true);
    expect(close.breakdown.total).toBeGreaterThan(0);

    const far = gradeSoloAnswer(gtn, '180', 0, 1000, 12000, 0); // 80% off → not "correct"
    expect(far.isCorrect).toBe(false);
  });
});

describe('clueStageForElapsed', () => {
  const whoami: Question = {
    id: 'w',
    type: 'who_am_i',
    difficulty: 'easy',
    category: 'players',
    clues: ['c1', 'c2', 'c3'],
    options: ['a', 'b', 'c', 'd'],
    correctAnswer: 'a',
    explanation: '',
  };

  it('reveals a new clue every 5 seconds, clamped to the last', () => {
    expect(clueStageForElapsed(whoami, 0)).toBe(0);
    expect(clueStageForElapsed(whoami, 6000)).toBe(1);
    expect(clueStageForElapsed(whoami, 99000)).toBe(2);
  });

  it('is always 0 for non who_am_i questions', () => {
    expect(clueStageForElapsed(mc, 12000)).toBe(0);
  });
});
