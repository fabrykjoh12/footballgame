import { describe, it, expect } from 'vitest';
import { scoutCatalog } from './categories';
import {
  dailyScoutCategory,
  foldScoutDaily,
  foldScoutDuel,
  buildScoutDailyShareText,
  buildScoutDuelShareText,
  type ScoutProgress,
} from './daily';

const EMPTY: ScoutProgress = {
  duelsPlayed: 0,
  duelsWon: 0,
  daily: {
    lastPlayedDate: null,
    streak: 0,
    bestStreak: 0,
    lastSolved: false,
    playsTotal: 0,
    solvedTotal: 0,
    bestProbes: null,
  },
};

describe('daily rule selection', () => {
  it('is deterministic per date and always in the catalog', () => {
    const a = dailyScoutCategory('2026-07-04');
    const b = dailyScoutCategory('2026-07-04');
    expect(a.id).toBe(b.id);
    expect(scoutCatalog().some((c) => c.id === a.id)).toBe(true);
  });

  it('varies across days', () => {
    const ids = new Set(
      ['2026-07-01', '2026-07-02', '2026-07-03', '2026-07-04', '2026-07-05',
       '2026-07-06', '2026-07-07', '2026-07-08', '2026-07-09', '2026-07-10',
      ].map((d) => dailyScoutCategory(d).id),
    );
    expect(ids.size).toBeGreaterThanOrEqual(3);
  });
});

describe('daily streak folding', () => {
  it('a first solve starts the streak at 1 and records bestProbes', () => {
    const next = foldScoutDaily(EMPTY, true, 7, '2026-07-04');
    expect(next.daily).toMatchObject({
      lastPlayedDate: '2026-07-04',
      streak: 1,
      bestStreak: 1,
      lastSolved: true,
      playsTotal: 1,
      solvedTotal: 1,
      bestProbes: 7,
    });
  });

  it('a consecutive-day solve extends; a gap restarts at 1', () => {
    const day1 = foldScoutDaily(EMPTY, true, 7, '2026-07-04');
    const day2 = foldScoutDaily(day1, true, 5, '2026-07-05');
    expect(day2.daily.streak).toBe(2);
    expect(day2.daily.bestProbes).toBe(5); // min-fold
    const afterGap = foldScoutDaily(day2, true, 9, '2026-07-08');
    expect(afterGap.daily.streak).toBe(1);
    expect(afterGap.daily.bestStreak).toBe(2);
    expect(afterGap.daily.bestProbes).toBe(5); // 9 does not beat 5
  });

  it('a fail zeroes the streak and never touches bestProbes', () => {
    const day1 = foldScoutDaily(EMPTY, true, 7, '2026-07-04');
    const day2 = foldScoutDaily(day1, false, 12, '2026-07-05');
    expect(day2.daily.streak).toBe(0);
    expect(day2.daily.lastSolved).toBe(false);
    expect(day2.daily.bestProbes).toBe(7);
  });

  it('records at most once per day', () => {
    const day1 = foldScoutDaily(EMPTY, true, 7, '2026-07-04');
    const again = foldScoutDaily(day1, false, 1, '2026-07-04');
    expect(again).toBe(day1);
  });
});

describe('duel folding', () => {
  it('counts plays and wins', () => {
    const one = foldScoutDuel(EMPTY, true);
    const two = foldScoutDuel(one, false);
    expect(two.duelsPlayed).toBe(2);
    expect(two.duelsWon).toBe(1);
  });
});

describe('share text', () => {
  it('daily text carries probes, misses and streak', () => {
    const text = buildScoutDailyShareText({ solved: true, probes: 6, wrongAccusations: 1, streak: 4 });
    expect(text).toContain('6 probes');
    expect(text).toContain('1 wrong accusation');
    expect(text).toContain('4-day streak');
    expect(text).toContain('#daily-scout');
  });

  it('duel text differs for win and loss', () => {
    expect(buildScoutDuelShareText({ won: true, probes: 8 })).toContain('8 probes');
    expect(buildScoutDuelShareText({ won: false, probes: 3 })).toContain('cracked my secret rule');
  });
});
