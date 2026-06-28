import { describe, it, expect } from 'vitest';
import {
  describeAttack,
  BIG_CHANCE_FRACTION,
  HALF_CHANCE_FRACTION,
  MOMENTUM_BONUS,
  LATE_MINUTE,
  type AttackInput,
} from './attackFraming';

const TOTAL = 20_000;

const base = (over: Partial<AttackInput> = {}): AttackInput => ({
  scoredGoal: false,
  isCorrect: false,
  answered: true,
  pointsEarned: 0,
  streakBonus: 0,
  timeTakenMs: TOTAL / 2,
  totalTimeMs: TOTAL,
  ...over,
});

describe('describeAttack — phase selection', () => {
  it('a scored goal always reads as GOAL, even on a slow answer', () => {
    const p = describeAttack(base({ scoredGoal: true, isCorrect: true, timeTakenMs: TOTAL }));
    expect(p.id).toBe('goal');
    expect(p.tone).toBe('goal');
    expect(p.label).toBe('GOAL');
  });

  it('a fast correct answer is a Big Chance', () => {
    // Use >= the big-chance threshold worth of remaining time.
    const fast = TOTAL * (1 - BIG_CHANCE_FRACTION) - 1;
    const p = describeAttack(base({ isCorrect: true, timeTakenMs: fast }));
    expect(p.id).toBe('big_chance');
    expect(p.tone).toBe('good');
  });

  it('a mid-pace correct answer is a Good Attack', () => {
    const p = describeAttack(base({ isCorrect: true, timeTakenMs: TOTAL * 0.5 }));
    expect(p.id).toBe('good_attack');
  });

  it('a slow correct answer at the buzzer is only a Half Chance', () => {
    const slow = TOTAL * (1 - HALF_CHANCE_FRACTION) + 1;
    const p = describeAttack(base({ isCorrect: true, timeTakenMs: slow }));
    expect(p.id).toBe('half_chance');
  });

  it('a wrong answer with partial credit hits the woodwork', () => {
    const p = describeAttack(base({ isCorrect: false, pointsEarned: 420 }));
    expect(p.id).toBe('woodwork');
    expect(p.tone).toBe('neutral');
  });

  it('a wrong answer with no credit is a shot saved', () => {
    const p = describeAttack(base({ isCorrect: false, answered: true, pointsEarned: 0 }));
    expect(p.id).toBe('shot_saved');
    expect(p.tone).toBe('bad');
  });

  it('no answer is a turnover', () => {
    const p = describeAttack(base({ isCorrect: false, answered: false }));
    expect(p.id).toBe('turnover');
    expect(p.tone).toBe('bad');
  });
});

describe('describeAttack — accents', () => {
  it('flags momentum on a 3+ streak for positive moments', () => {
    const p = describeAttack(base({ isCorrect: true, streakBonus: MOMENTUM_BONUS }));
    expect(p.momentum).toBe(true);
    expect(p.detail).toContain('momentum');
  });

  it('does not call a turnover momentum even with a stale streak bonus', () => {
    const p = describeAttack(base({ isCorrect: false, answered: false, streakBonus: MOMENTUM_BONUS }));
    expect(p.id).toBe('turnover');
    expect(p.detail).not.toContain('momentum');
  });

  it('adds late-pressure framing to a good late-game moment', () => {
    const p = describeAttack(base({ isCorrect: true, minute: LATE_MINUTE }));
    expect(p.late).toBe(true);
    expect(p.detail.toLowerCase()).toContain('late pressure');
  });

  it('treats sub-2 streaks as no momentum', () => {
    const p = describeAttack(base({ isCorrect: true, streakBonus: 50 }));
    expect(p.momentum).toBe(false);
  });
});

describe('describeAttack — determinism', () => {
  it('is deterministic for a given seed', () => {
    const a = describeAttack(base({ isCorrect: true }), 7);
    const b = describeAttack(base({ isCorrect: true }), 7);
    expect(a.detail).toBe(b.detail);
  });

  it('handles a zero/invalid total time without throwing', () => {
    const p = describeAttack(base({ isCorrect: true, totalTimeMs: 0 }));
    // No remaining-time info → treated as a buzzer-beater half chance.
    expect(p.id).toBe('half_chance');
  });

  it('always returns a non-empty label and detail', () => {
    const p = describeAttack(base({ isCorrect: true }), -3);
    expect(p.label.length).toBeGreaterThan(0);
    expect(p.detail.length).toBeGreaterThan(0);
  });
});
