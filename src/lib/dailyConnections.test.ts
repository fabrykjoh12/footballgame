import { describe, it, expect } from 'vitest';
import {
  nextConnectionStreak,
  foldDailyConnectionResult,
  type DailyConnectionsState,
} from './dailyConnections';
import { dailyConnection } from './connections';

const EMPTY: DailyConnectionsState = {
  lastPlayedDate: null,
  streak: 0,
  bestStreak: 0,
  lastSolved: false,
  playsTotal: 0,
  solvedTotal: 0,
};

describe('dailyConnection selection', () => {
  it('is deterministic for a given date and varies across dates', () => {
    expect(dailyConnection('2026-06-28').id).toBe(dailyConnection('2026-06-28').id);
    const week = ['2026-06-28', '2026-06-29', '2026-06-30', '2026-07-01', '2026-07-02']
      .map((d) => dailyConnection(d).id);
    expect(new Set(week).size).toBeGreaterThan(1); // not always the same puzzle
  });

  it('always returns a real puzzle', () => {
    const c = dailyConnection('2026-12-25');
    expect(c.clubA).toBeTruthy();
    expect(c.clubB).toBeTruthy();
  });
});

describe('nextConnectionStreak', () => {
  it('extends when yesterday was the last solve', () => {
    expect(nextConnectionStreak('2026-06-27', 4, true, '2026-06-28')).toBe(5);
  });
  it('restarts at 1 after a gap', () => {
    expect(nextConnectionStreak('2026-06-25', 9, true, '2026-06-28')).toBe(1);
  });
  it('resets to 0 on a fail', () => {
    expect(nextConnectionStreak('2026-06-27', 4, false, '2026-06-28')).toBe(0);
  });
  it('first ever solve is a streak of 1', () => {
    expect(nextConnectionStreak(null, 0, true, '2026-06-28')).toBe(1);
  });
});

describe('foldDailyConnectionResult', () => {
  it('records a first solve and folds bests', () => {
    const a = foldDailyConnectionResult(EMPTY, true, '2026-06-28');
    expect(a).toMatchObject({ streak: 1, bestStreak: 1, solvedTotal: 1, playsTotal: 1, lastSolved: true });
  });

  it('ignores a second result on the same day', () => {
    const a = foldDailyConnectionResult(EMPTY, true, '2026-06-28');
    const again = foldDailyConnectionResult(a, false, '2026-06-28');
    expect(again).toBe(a); // unchanged
  });

  it('builds a streak across consecutive solved days, breaking on a miss', () => {
    let s = foldDailyConnectionResult(EMPTY, true, '2026-06-28');
    s = foldDailyConnectionResult(s, true, '2026-06-29');
    s = foldDailyConnectionResult(s, true, '2026-06-30');
    expect(s).toMatchObject({ streak: 3, bestStreak: 3, solvedTotal: 3, playsTotal: 3 });
    s = foldDailyConnectionResult(s, false, '2026-07-01');
    expect(s.streak).toBe(0);
    expect(s.bestStreak).toBe(3); // best preserved
    expect(s.playsTotal).toBe(4);
  });
});
