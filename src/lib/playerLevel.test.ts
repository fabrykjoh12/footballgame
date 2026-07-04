import { describe, it, expect } from 'vitest';
import { totalXp, levelSpan, playerLevel, rankTitle } from './playerLevel';
import type { ProfileStats } from './profileStats';

const base: ProfileStats = {
  matchesPlayed: 0,
  wins: 0,
  losses: 0,
  draws: 0,
  totalCorrect: 0,
  bestStreak: 0,
  goalsScored: 0,
} as ProfileStats;

describe('playerLevel', () => {
  it('a fresh profile is level 1 with zero xp', () => {
    const pl = playerLevel(base);
    expect(pl.xp).toBe(0);
    expect(pl.level).toBe(1);
    expect(pl.intoLevel).toBe(0);
    expect(pl.progress).toBe(0);
    expect(pl.title).toBe('Sunday League');
  });

  it('sums xp from every source', () => {
    const s = { ...base, wins: 2, draws: 1, losses: 1, totalCorrect: 10, goalsScored: 3 };
    // 200 + 45 + 35 + 50 + 45 = 375
    expect(totalXp(s)).toBe(375);
  });

  it('levels up once xp exceeds the first span, keeping the remainder', () => {
    const s = { ...base, wins: 3 }; // 300 xp; level-1 span is 250
    const pl = playerLevel(s);
    expect(pl.level).toBe(2);
    expect(pl.intoLevel).toBe(50); // 300 - 250
    expect(pl.span).toBe(levelSpan(2));
    expect(pl.toNext).toBe(levelSpan(2) - 50);
    expect(pl.progress).toBeCloseTo(50 / levelSpan(2));
  });

  it('span rises with level', () => {
    expect(levelSpan(1)).toBeLessThan(levelSpan(2));
    expect(levelSpan(2)).toBeLessThan(levelSpan(3));
  });

  it('is monotonic — more xp never lowers the level', () => {
    let prev = 0;
    for (let wins = 0; wins < 60; wins++) {
      const lvl = playerLevel({ ...base, wins }).level;
      expect(lvl).toBeGreaterThanOrEqual(prev);
      prev = lvl;
    }
  });

  it('maps levels to rank titles', () => {
    expect(rankTitle(1)).toBe('Sunday League');
    expect(rankTitle(5)).toBe('Semi-Pro');
    expect(rankTitle(12)).toBe('Elite');
    expect(rankTitle(30)).toBe('Legend');
  });
});
