import { describe, it, expect } from 'vitest';
import { addRecentOpponent, RECENT_CAP, type RecentOpponent } from './recentOpponents';

describe('addRecentOpponent', () => {
  it('adds a new opponent at the front', () => {
    const out = addRecentOpponent([], 'Jonas United', 100);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ name: 'Jonas United', games: 1, lastPlayedAt: 100 });
  });

  it('merges by normalised name and bumps the game count + time', () => {
    let list: RecentOpponent[] = [];
    list = addRecentOpponent(list, 'Jonas United', 100);
    list = addRecentOpponent(list, '  jonas   united ', 200);
    expect(list).toHaveLength(1);
    expect(list[0].games).toBe(2);
    expect(list[0].lastPlayedAt).toBe(200);
    expect(list[0].name).toBe('jonas   united'); // refreshed spelling (trimmed)
  });

  it('keeps most-recent first', () => {
    let list: RecentOpponent[] = [];
    list = addRecentOpponent(list, 'A', 100);
    list = addRecentOpponent(list, 'B', 200);
    list = addRecentOpponent(list, 'A', 300);
    expect(list.map((o) => o.name)).toEqual(['A', 'B']);
    expect(list[0].lastPlayedAt).toBe(300);
  });

  it('ignores blank names', () => {
    expect(addRecentOpponent([], '   ', 1)).toHaveLength(0);
  });

  it('caps the list length', () => {
    let list: RecentOpponent[] = [];
    for (let i = 0; i < RECENT_CAP + 5; i++) list = addRecentOpponent(list, `P${i}`, i);
    expect(list).toHaveLength(RECENT_CAP);
    // The newest survive; the oldest fall off.
    expect(list[0].name).toBe(`P${RECENT_CAP + 4}`);
  });
});
