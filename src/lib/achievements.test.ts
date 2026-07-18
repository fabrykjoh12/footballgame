import { describe, it, expect } from 'vitest';
import {
  ACHIEVEMENTS,
  evaluateAchievements,
  listAchievements,
  earnedCount,
  EMPTY_MODE_PROGRESS,
  type AchievementContext,
  type ModeProgress,
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
    feats: over.feats ?? new Set(),
    modes: { ...EMPTY_MODE_PROGRESS, ...over.modes },
  };
}

describe('achievement definitions', () => {
  it('have unique ids', () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every badge has a distinct icon', () => {
    const icons = ACHIEVEMENTS.map((a) => a.icon);
    expect(new Set(icons).size).toBe(icons.length);
  });
});

describe('mode achievements', () => {
  const m = (over: Partial<ModeProgress>): AchievementContext => ctx({ modes: { ...EMPTY_MODE_PROGRESS, ...over } });

  it('unlock from the solo / deduction mode bests, at their thresholds', () => {
    expect(evaluateAchievements(m({ survivalBest: 14 })).has('survivor')).toBe(false);
    expect(evaluateAchievements(m({ survivalBest: 15 })).has('survivor')).toBe(true);
    expect(evaluateAchievements(m({ timeAttackBest: 4000 })).has('time_attacker')).toBe(true);
    expect(evaluateAchievements(m({ gauntletPerfect: true })).has('gauntlet_clear')).toBe(true);
    expect(evaluateAchievements(m({ connectionsBestCorrect: 8 })).has('connector')).toBe(true);
    expect(evaluateAchievements(m({ scoutDuelsWon: 1 })).has('super_scout')).toBe(true);
    expect(evaluateAchievements(m({ scoutDuelsWon: 4 })).has('master_detective')).toBe(false);
    expect(evaluateAchievements(m({ scoutDuelsWon: 5 })).has('master_detective')).toBe(true);
    expect(evaluateAchievements(m({ olderYoungerBest: 12 })).has('time_traveller')).toBe(true);
    expect(evaluateAchievements(m({ careerPathBest: 8 })).has('well_travelled')).toBe(true);
    expect(evaluateAchievements(m({ managersBest: 8 })).has('merry_go_round')).toBe(true);
    expect(evaluateAchievements(m({ rondoDuelsWon: 1 })).has('tiki_taka')).toBe(true);
    expect(evaluateAchievements(m({ rondoBestRun: 14 })).has('keep_ball')).toBe(false);
    expect(evaluateAchievements(m({ rondoBestRun: 15 })).has('keep_ball')).toBe(true);
  });

  it('stay locked with no mode progress', () => {
    const earned = evaluateAchievements(ctx());
    for (const id of ['survivor', 'time_attacker', 'gauntlet_clear', 'connector', 'super_scout', 'time_traveller', 'well_travelled', 'merry_go_round']) {
      expect(earned.has(id)).toBe(false);
    }
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
