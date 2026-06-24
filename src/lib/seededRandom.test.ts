import { describe, it, expect } from 'vitest';
import {
  mulberry32,
  hashString,
  todayString,
  previousDay,
  dailySeed,
} from './seededRandom';

describe('mulberry32', () => {
  it('is deterministic for a given seed', () => {
    const a = mulberry32(123);
    const b = mulberry32(123);
    expect([a(), a(), a(), a()]).toEqual([b(), b(), b(), b()]);
  });

  it('produces different streams for different seeds', () => {
    expect(mulberry32(1)()).not.toEqual(mulberry32(2)());
  });

  it('stays within [0, 1)', () => {
    const r = mulberry32(42);
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('hashString / dailySeed', () => {
  it('is stable for the same input', () => {
    expect(hashString('abc')).toBe(hashString('abc'));
    expect(dailySeed('2026-06-24')).toBe(dailySeed('2026-06-24'));
  });

  it('changes from day to day', () => {
    expect(dailySeed('2026-06-24')).not.toBe(dailySeed('2026-06-25'));
  });
});

describe('date helpers', () => {
  it('formats a local date as YYYY-MM-DD', () => {
    expect(todayString(new Date(2026, 5, 24))).toBe('2026-06-24');
    expect(todayString(new Date(2026, 0, 3))).toBe('2026-01-03');
  });

  it('previousDay rolls back across month and year boundaries', () => {
    expect(previousDay('2026-06-24')).toBe('2026-06-23');
    expect(previousDay('2026-07-01')).toBe('2026-06-30');
    expect(previousDay('2026-01-01')).toBe('2025-12-31');
    expect(previousDay('2024-03-01')).toBe('2024-02-29'); // leap year
  });
});
