import { describe, it, expect } from 'vitest';
import {
  ACHIEVEMENTS,
  evaluateAchievements,
  listAchievements,
  earnedCount,
  type AchievementContext,
} from './achievements';
import type { ProfileStats } from './profileStats';
import type { DailyState } from './dailyChallenge';

const emptyProfile: ProfileStats = {
  matchesPlayed: 0,
  wins: 0,
  losses: 0,
  draws: 0,
  totalCorrect: 0,
  totalQuestions: 0,
  bestStreak: 0,
  goalsScored: 0,
  fastestAnswerMs: null,
};

const emptyDaily: DailyState = {
  lastPlayedDate: null,
  streak: 0,
  bestScore: 0,
  lastScore: 0,
  lastOutcome: null,
  playsTotal: 0,
};

function ctx(over: Partial<AchievementContext> = {}): AchievementContext {
  return {
    profile: { ...emptyProfile, ...over.profile },
    daily: { ...emptyDaily, ...over.daily },
    h2h: over.h2h ?? {},
  };
}

describe('achievement definitions', () => {
  it('have unique ids', () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('evaluateAchievements', () => {
  it('awards nothing for a fresh profile', () => {
    expect(evaluateAchievements(ctx()).size).toBe(0);
  });

  it('awards debut + first win appropriately', () => {
    expect(evaluateAchievements(ctx({ profile: { matchesPlayed: 1 } as ProfileStats })).has('debut')).toBe(true);
    const won = evaluateAchievements(ctx({ profile: { matchesPlayed: 1, wins: 1 } as ProfileStats }));
    expect(won.has('first_win')).toBe(true);
  });

  it('awards lightning only under the 2s threshold', () => {
    expect(evaluateAchievements(ctx({ profile: { fastestAnswerMs: 2500 } as ProfileStats })).has('lightning')).toBe(false);
    expect(evaluateAchievements(ctx({ profile: { fastestAnswerMs: 1800 } as ProfileStats })).has('lightning')).toBe(true);
  });

  it('gates title contender on win-rate AND volume', () => {
    // 6 wins of 8 = 75% but under 10 matches → not yet.
    expect(
      evaluateAchievements(ctx({ profile: { matchesPlayed: 8, wins: 6 } as ProfileStats })).has('contender'),
    ).toBe(false);
    // 7 of 10 = 70% over 10 → earned.
    expect(
      evaluateAchievements(ctx({ profile: { matchesPlayed: 10, wins: 7 } as ProfileStats })).has('contender'),
    ).toBe(true);
  });

  it('awards a rivalry after 3 meetings with one opponent', () => {
    const h2h = { jonas: { name: 'Jonas', wins: 1, draws: 1, losses: 1, goalsFor: 4, goalsAgainst: 4, played: 3 } };
    expect(evaluateAchievements(ctx({ h2h })).has('rivalry')).toBe(true);
  });

  it('awards the daily streak badge at 7 days', () => {
    expect(evaluateAchievements(ctx({ daily: { streak: 7 } as DailyState })).has('daily_devotee')).toBe(true);
  });
});

describe('listAchievements', () => {
  it('flags unlocked vs locked and matches earnedCount', () => {
    const c = ctx({ profile: { matchesPlayed: 1, wins: 1 } as ProfileStats });
    const list = listAchievements(c);
    expect(list).toHaveLength(ACHIEVEMENTS.length);
    expect(list.filter((a) => a.unlocked).length).toBe(earnedCount(c));
  });
});
