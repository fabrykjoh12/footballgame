import { describe, it, expect } from 'vitest';
import {
  STREAK_MILESTONES,
  reachedMilestones,
  nextMilestone,
  daysToNextReward,
  streakProgress,
  streakLadder,
  milestoneCrossed,
} from './streakRewards';
import { isAccentUnlocked, isPatternUnlocked, type CosmeticContext } from './cosmetics';

const ctx = (dailyStreak: number): CosmeticContext => ({
  matches: 0,
  wins: 0,
  bestStreak: 0,
  dailyStreak,
  achievements: 0,
  trophies: 0,
  feats: new Set(),
});

describe('streak milestone ladder', () => {
  it('is ascending with unique day thresholds and cosmetic ids', () => {
    const days = STREAK_MILESTONES.map((m) => m.days);
    expect(days).toEqual([...days].sort((a, b) => a - b));
    expect(new Set(days).size).toBe(days.length);
    expect(new Set(STREAK_MILESTONES.map((m) => m.cosmeticId)).size).toBe(STREAK_MILESTONES.length);
  });

  it('reports reached milestones by streak length', () => {
    expect(reachedMilestones(0)).toHaveLength(0);
    expect(reachedMilestones(3).map((m) => m.days)).toEqual([3]);
    expect(reachedMilestones(7).map((m) => m.days)).toEqual([3, 7]);
    expect(reachedMilestones(100).map((m) => m.days)).toEqual([3, 7, 14, 30]);
  });

  it('finds the next milestone (null once all done)', () => {
    expect(nextMilestone(0)?.days).toBe(3);
    expect(nextMilestone(3)?.days).toBe(7);
    expect(nextMilestone(29)?.days).toBe(30);
    expect(nextMilestone(30)).toBeNull();
    expect(nextMilestone(45)).toBeNull();
  });

  it('counts days to the next reward', () => {
    expect(daysToNextReward(0)).toBe(3);
    expect(daysToNextReward(2)).toBe(1);
    expect(daysToNextReward(7)).toBe(7); // next is 14
    expect(daysToNextReward(30)).toBe(0);
  });

  it('keeps progress within [0,1] and full when complete', () => {
    for (const s of [0, 1, 3, 5, 7, 14, 22, 30, 99]) {
      const p = streakProgress(s);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
    }
    expect(streakProgress(3)).toBe(0); // just hit 3, 0% toward 7
    expect(streakProgress(30)).toBe(1);
  });

  it('annotates the ladder with reached / next flags', () => {
    const ladder = streakLadder(7);
    expect(ladder.find((s) => s.days === 3)?.reached).toBe(true);
    expect(ladder.find((s) => s.days === 7)?.reached).toBe(true);
    expect(ladder.find((s) => s.days === 14)?.reached).toBe(false);
    expect(ladder.find((s) => s.days === 14)?.isNext).toBe(true);
    expect(ladder.filter((s) => s.isNext)).toHaveLength(1);
  });

  it('detects the highest milestone crossed on a streak increment', () => {
    expect(milestoneCrossed(2, 3)?.days).toBe(3);
    expect(milestoneCrossed(6, 7)?.days).toBe(7);
    expect(milestoneCrossed(3, 4)).toBeNull();
    // A jump that crosses two returns the highest.
    expect(milestoneCrossed(0, 10)?.days).toBe(7);
  });
});

describe('ladder ↔ cosmetics catalogue stay in sync', () => {
  it('unlocks each milestone cosmetic exactly at its day threshold', () => {
    for (const m of STREAK_MILESTONES) {
      const check = m.kind === 'accent' ? isAccentUnlocked : isPatternUnlocked;
      expect(check(m.cosmeticId, ctx(m.days - 1)), `${m.cosmeticId} locked below ${m.days}`).toBe(false);
      expect(check(m.cosmeticId, ctx(m.days)), `${m.cosmeticId} unlocked at ${m.days}`).toBe(true);
    }
  });
});
