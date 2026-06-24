import { describe, it, expect } from 'vitest';
import { nextStreak, hasPlayedToday, dailySettings, type DailyState } from './dailyChallenge';

function state(partial: Partial<DailyState>): DailyState {
  return {
    lastPlayedDate: null,
    streak: 0,
    bestScore: 0,
    lastScore: 0,
    lastOutcome: null,
    playsTotal: 0,
    ...partial,
  };
}

describe('nextStreak', () => {
  it('starts at 1 on the first ever play', () => {
    expect(nextStreak(null, 0, '2026-06-24')).toBe(1);
  });

  it('increments when yesterday was played', () => {
    expect(nextStreak('2026-06-23', 4, '2026-06-24')).toBe(5);
  });

  it('resets to 1 after a missed day', () => {
    expect(nextStreak('2026-06-20', 9, '2026-06-24')).toBe(1);
  });

  it('is unchanged when already played today', () => {
    expect(nextStreak('2026-06-24', 7, '2026-06-24')).toBe(7);
  });
});

describe('hasPlayedToday', () => {
  it('compares the stored date against today', () => {
    expect(hasPlayedToday(state({ lastPlayedDate: '2026-06-24' }), '2026-06-24')).toBe(true);
    expect(hasPlayedToday(state({ lastPlayedDate: '2026-06-23' }), '2026-06-24')).toBe(false);
    expect(hasPlayedToday(state({ lastPlayedDate: null }), '2026-06-24')).toBe(false);
  });
});

describe('dailySettings', () => {
  it('is a fixed, seeded, daily-flagged config', () => {
    const s = dailySettings('2026-06-24');
    expect(s.isDaily).toBe(true);
    expect(s.questionCount).toBe(10);
    expect(typeof s.seed).toBe('number');
    // Same day → same seed; different day → different seed.
    expect(dailySettings('2026-06-24').seed).toBe(s.seed);
    expect(dailySettings('2026-06-25').seed).not.toBe(s.seed);
  });
});
