import { describe, it, expect } from 'vitest';
import { seasonStorylines } from './careerStorylines';
import { createCareer, YOU_ID, ROUNDS_PER_SEASON, type CareerState } from './career';

function fresh(): CareerState {
  return createCareer('Sara', 12345);
}

describe('seasonStorylines', () => {
  it('opens a fresh season with a new-campaign beat', () => {
    const s = seasonStorylines(fresh());
    expect(s.some((x) => x.id === 'new-season')).toBe(true);
  });

  it('returns nothing when the season is not in progress', () => {
    const state = { ...fresh(), status: 'season_complete' as const };
    expect(seasonStorylines(state)).toEqual([]);
  });

  it('surfaces a winless run after three non-wins', () => {
    const state = fresh();
    // Fabricate three played rounds where YOU lost each.
    const other = state.teams.find((t) => !t.isYou)!.id;
    state.results = [
      [{ homeId: YOU_ID, awayId: other, homeGoals: 0, awayGoals: 2 }],
      [{ homeId: other, awayId: YOU_ID, homeGoals: 3, awayGoals: 1 }],
      [{ homeId: YOU_ID, awayId: other, homeGoals: 0, awayGoals: 1 }],
    ];
    state.round = 3;
    const s = seasonStorylines(state);
    const winless = s.find((x) => x.id === 'winless');
    expect(winless).toBeTruthy();
    expect(winless!.headline).toContain('3');
  });

  it('flags final day at the last fixture', () => {
    const state = fresh();
    state.round = ROUNDS_PER_SEASON - 1;
    const s = seasonStorylines(state);
    expect(s.some((x) => x.tone === 'promotion' || x.tone === 'relegation' || x.id === 'final-day')).toBe(true);
  });

  it('is deterministic for the same state', () => {
    const state = fresh();
    expect(seasonStorylines(state)).toEqual(seasonStorylines(state));
  });

  it('sorts the most important beat first', () => {
    const state = fresh();
    state.round = ROUNDS_PER_SEASON - 1; // final day → high priority
    const s = seasonStorylines(state);
    for (let i = 1; i < s.length; i++) {
      expect(s[i - 1].priority).toBeGreaterThanOrEqual(s[i].priority);
    }
  });
});
