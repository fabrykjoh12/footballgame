import { describe, it, expect } from 'vitest';
import {
  dailyRivalName,
  dailyFixtureLabel,
  msUntilNextDay,
  formatCountdown,
  buildDailyChallengeLink,
  parseDailyChallengeParams,
  buildDailyShareText,
  dailyFixtureMood,
  DAILY_RIVALS,
} from './dailyRival';

describe('dailyRivalName', () => {
  it('is deterministic for a given day', () => {
    expect(dailyRivalName('2026-06-27')).toBe(dailyRivalName('2026-06-27'));
  });
  it('always returns a club from the pool', () => {
    for (const d of ['2026-01-01', '2026-06-27', '2026-12-31', '2025-03-14']) {
      expect(DAILY_RIVALS).toContain(dailyRivalName(d) as (typeof DAILY_RIVALS)[number]);
    }
  });
  it('varies across days', () => {
    const names = new Set(
      Array.from({ length: 20 }, (_, i) => dailyRivalName(`2026-06-${String(i + 1).padStart(2, '0')}`)),
    );
    expect(names.size).toBeGreaterThan(1);
  });
});

describe('dailyFixtureLabel', () => {
  it('formats a known weekday/month', () => {
    // 2026-06-27 is a Saturday.
    expect(dailyFixtureLabel('2026-06-27')).toBe('Matchday · Sat 27 Jun');
  });
  it('degrades gracefully on a bad date', () => {
    expect(dailyFixtureLabel('nonsense')).toBe('Matchday');
  });
});

describe('countdown helpers', () => {
  it('msUntilNextDay is positive and under a day', () => {
    const now = new Date(2026, 5, 27, 22, 0, 0);
    const ms = msUntilNextDay(now);
    expect(ms).toBe(2 * 60 * 60 * 1000); // 2 hours to midnight
  });
  it('formats hours and minutes', () => {
    expect(formatCountdown(2 * 3600_000 + 23 * 60_000)).toBe('2h 23m');
    expect(formatCountdown(45 * 60_000)).toBe('45m');
  });
});

describe('challenge links', () => {
  it('round-trips through build + parse', () => {
    const url = buildDailyChallengeLink('https://x.io/footballgame/', {
      date: '2026-06-27',
      goalsFor: 4,
      goalsAgainst: 1,
      score: 8200,
      by: 'Modock',
    });
    const parsed = parseDailyChallengeParams(url.slice(url.indexOf('?')));
    expect(parsed).toEqual({
      date: '2026-06-27',
      goalsFor: 4,
      goalsAgainst: 1,
      score: 8200,
      by: 'Modock',
    });
  });

  it('appends with & when the base already has a query', () => {
    const url = buildDailyChallengeLink('https://x.io/?a=1', {
      date: '2026-06-27',
      goalsFor: 1,
      goalsAgainst: 0,
      score: 5000,
    });
    expect(url).toContain('?a=1&');
  });

  it('rejects a missing or malformed daily param', () => {
    expect(parseDailyChallengeParams('?gf=1&ga=0&s=10')).toBeNull();
    expect(parseDailyChallengeParams('?daily=27-06-2026&gf=1&ga=0&s=10')).toBeNull();
    expect(parseDailyChallengeParams('')).toBeNull();
  });

  it('rejects when a numeric field is absent', () => {
    expect(parseDailyChallengeParams('?daily=2026-06-27&gf=1')).toBeNull();
  });
});

describe('share text', () => {
  it('frames a win as a challenge', () => {
    const text = buildDailyShareText({ goalsFor: 4, goalsAgainst: 1, outcome: 'win', link: 'L' });
    expect(text).toContain('won');
    expect(text).toContain('4–1');
    expect(text).toContain('Can you beat me?');
    expect(text).toContain('L');
  });
  it('frames a loss without the boast', () => {
    const text = buildDailyShareText({ goalsFor: 1, goalsAgainst: 3, outcome: 'loss' });
    expect(text).toContain('lost');
    expect(text).not.toContain('Can you beat me?');
  });
});

describe('dailyFixtureMood', () => {
  it('is deterministic per day', () => {
    expect(dailyFixtureMood('2026-06-27')).toBe(dailyFixtureMood('2026-06-27'));
  });
});
