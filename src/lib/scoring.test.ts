import { describe, it, expect } from 'vitest';
import {
  calculateBasePoints,
  calculateSpeedBonus,
  calculateStreakBonus,
  calculateQuestionPoints,
  calculateGoalsFromPoints,
  getFootballEventLabel,
  getSoloPlayerEvents,
  accuracyPercent,
  guessAccuracy,
} from './scoring';

describe('calculateBasePoints', () => {
  it('drops by clue stage for who_am_i and clamps', () => {
    expect(calculateBasePoints('who_am_i', 0)).toBe(1000);
    expect(calculateBasePoints('who_am_i', 1)).toBe(700);
    expect(calculateBasePoints('who_am_i', 2)).toBe(400);
    expect(calculateBasePoints('who_am_i', 9)).toBe(400);
    expect(calculateBasePoints('who_am_i', -1)).toBe(1000);
  });

  it('is fixed for the other types', () => {
    expect(calculateBasePoints('career_path')).toBe(800);
    expect(calculateBasePoints('higher_lower')).toBe(700);
    expect(calculateBasePoints('club_country')).toBe(700);
    expect(calculateBasePoints('guess_year')).toBe(700);
  });
});

describe('calculateGoalsFromPoints', () => {
  it('maps points to goals at every threshold', () => {
    expect(calculateGoalsFromPoints(0)).toBe(0);
    expect(calculateGoalsFromPoints(2499)).toBe(0);
    expect(calculateGoalsFromPoints(2500)).toBe(1);
    expect(calculateGoalsFromPoints(4999)).toBe(1);
    expect(calculateGoalsFromPoints(5000)).toBe(2);
    expect(calculateGoalsFromPoints(7500)).toBe(3);
    expect(calculateGoalsFromPoints(10000)).toBe(4);
    expect(calculateGoalsFromPoints(12500)).toBe(5);
  });

  it('caps at 5 goals and never goes negative', () => {
    expect(calculateGoalsFromPoints(999999)).toBe(5);
    expect(calculateGoalsFromPoints(-100)).toBe(0);
  });
});

describe('calculateSpeedBonus', () => {
  it('is full when instant and zero at the buzzer', () => {
    expect(calculateSpeedBonus('club_country', 0, 15000)).toBe(300);
    expect(calculateSpeedBonus('club_country', 15000, 15000)).toBe(0);
    expect(calculateSpeedBonus('club_country', 7500, 15000)).toBe(150);
  });

  it('never returns a negative bonus past the buzzer', () => {
    expect(calculateSpeedBonus('club_country', 20000, 15000)).toBe(0);
  });
});

describe('calculateStreakBonus', () => {
  it('rewards 2/3/4+ in a row', () => {
    expect(calculateStreakBonus(0)).toBe(0);
    expect(calculateStreakBonus(1)).toBe(0);
    expect(calculateStreakBonus(2)).toBe(50);
    expect(calculateStreakBonus(3)).toBe(100);
    expect(calculateStreakBonus(4)).toBe(150);
    expect(calculateStreakBonus(10)).toBe(150);
  });
});

describe('calculateQuestionPoints', () => {
  it('scores nothing for a wrong answer', () => {
    const r = calculateQuestionPoints({
      type: 'club_country',
      isCorrect: false,
      clueStage: 0,
      timeTakenMs: 0,
      totalTimeMs: 15000,
      newStreak: 0,
    });
    expect(r).toEqual({ base: 0, speedBonus: 0, streakBonus: 0, total: 0 });
  });

  it('sums base + speed + streak for a correct answer', () => {
    const r = calculateQuestionPoints({
      type: 'club_country',
      isCorrect: true,
      clueStage: 0,
      timeTakenMs: 0,
      totalTimeMs: 15000,
      newStreak: 2,
    });
    expect(r.base).toBe(700);
    expect(r.speedBonus).toBe(300);
    expect(r.streakBonus).toBe(50);
    expect(r.total).toBe(1050);
  });
});

describe('guessAccuracy (closeness for Guess the Number)', () => {
  it('is 1 for an exact guess', () => {
    expect(guessAccuracy(100, 100)).toBe(1);
  });

  it('scales linearly with the relative error', () => {
    // 10% off → 0.9 of the pot, 90% off → 0.1 (the user spec).
    expect(guessAccuracy(110, 100)).toBeCloseTo(0.9, 5);
    expect(guessAccuracy(90, 100)).toBeCloseTo(0.9, 5);
    expect(guessAccuracy(190, 100)).toBeCloseTo(0.1, 5);
    expect(guessAccuracy(50, 100)).toBeCloseTo(0.5, 5);
  });

  it('floors at 0 once the guess is 100%+ off', () => {
    expect(guessAccuracy(200, 100)).toBe(0);
    expect(guessAccuracy(1000, 100)).toBe(0);
    expect(guessAccuracy(0, 100)).toBe(0);
  });

  it('handles the zero-target and non-finite edge cases', () => {
    expect(guessAccuracy(0, 0)).toBe(1);
    expect(guessAccuracy(5, 0)).toBe(0);
    expect(guessAccuracy(NaN, 100)).toBe(0);
    expect(guessAccuracy(100, NaN)).toBe(0);
  });
});

describe('calculateQuestionPoints with closeness (Guess the Number)', () => {
  it('pays a scaled share of the pot for a near miss', () => {
    // 10% off at the buzzer (no speed bonus): ~90% of base.
    const r = calculateQuestionPoints({
      type: 'guess_the_number',
      isCorrect: true,
      clueStage: 0,
      timeTakenMs: 15000,
      totalTimeMs: 15000,
      newStreak: 1,
      accuracy: 0.9,
    });
    expect(r.base).toBe(Math.round(800 * 0.9));
    expect(r.speedBonus).toBe(0);
    expect(r.total).toBe(r.base + r.speedBonus + r.streakBonus);
  });

  it('scales the speed bonus by closeness too', () => {
    // Instant, 50% accuracy: half of base AND half of the speed bonus.
    const r = calculateQuestionPoints({
      type: 'guess_the_number',
      isCorrect: false,
      clueStage: 0,
      timeTakenMs: 0,
      totalTimeMs: 15000,
      newStreak: 0,
      accuracy: 0.5,
    });
    expect(r.base).toBe(Math.round(800 * 0.5));
    expect(r.speedBonus).toBe(Math.round(300 * 0.5));
    // Not close enough to count → no streak bonus.
    expect(r.streakBonus).toBe(0);
  });

  it('awards the streak bonus only when the guess counts as correct', () => {
    const close = calculateQuestionPoints({
      type: 'guess_the_number',
      isCorrect: true,
      clueStage: 0,
      timeTakenMs: 0,
      totalTimeMs: 15000,
      newStreak: 2,
      accuracy: 0.95,
    });
    expect(close.streakBonus).toBe(50);
  });

  it('pays nothing when the guess is 100%+ off', () => {
    const r = calculateQuestionPoints({
      type: 'guess_the_number',
      isCorrect: false,
      clueStage: 0,
      timeTakenMs: 0,
      totalTimeMs: 15000,
      newStreak: 0,
      accuracy: 0,
    });
    expect(r).toEqual({ base: 0, speedBonus: 0, streakBonus: 0, total: 0 });
  });
});

describe('getFootballEventLabel', () => {
  it('returns the display label for each event', () => {
    expect(getFootballEventLabel('goal')).toBe('GOAL!');
    expect(getFootballEventLabel('equalizer')).toBe('Equalizer!');
    expect(getFootballEventLabel('late_winner')).toBe('Late Winner!');
    expect(getFootballEventLabel('hat_trick')).toContain('Hat-trick');
    expect(getFootballEventLabel('counterattack')).toBe('Counterattack!');
  });
});

describe('getSoloPlayerEvents', () => {
  it('flags a scored goal and a fast counterattack', () => {
    const e = getSoloPlayerEvents({
      isCorrect: true,
      scoredGoal: true,
      newStreak: 1,
      timeTakenMs: 1000,
    });
    expect(e).toContain('goal');
    expect(e).toContain('counterattack');
  });

  it('flags a hat-trick only on multiples of 3', () => {
    const base = { isCorrect: true, scoredGoal: false, timeTakenMs: 9000 };
    expect(getSoloPlayerEvents({ ...base, newStreak: 3 })).toContain('hat_trick');
    expect(getSoloPlayerEvents({ ...base, newStreak: 6 })).toContain('hat_trick');
    expect(getSoloPlayerEvents({ ...base, newStreak: 4 })).not.toContain('hat_trick');
  });

  it('gives no events for a wrong answer', () => {
    expect(
      getSoloPlayerEvents({
        isCorrect: false,
        scoredGoal: false,
        newStreak: 0,
        timeTakenMs: 500,
      }),
    ).toEqual([]);
  });
});

describe('accuracyPercent', () => {
  it('rounds and guards divide-by-zero', () => {
    expect(accuracyPercent(0, 0)).toBe(0);
    expect(accuracyPercent(5, 10)).toBe(50);
    expect(accuracyPercent(1, 3)).toBe(33);
    expect(accuracyPercent(2, 3)).toBe(67);
  });
});
