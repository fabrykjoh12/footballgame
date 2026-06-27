import { describe, it, expect } from 'vitest';
import { dailyBoardId, boardLabel, ALLTIME_BOARD_ID } from './leaderboard';

describe('dailyBoardId', () => {
  it('builds a per-day board id', () => {
    expect(dailyBoardId('2026-06-27')).toBe('daily-2026-06-27');
  });

  it('differs by day so each day is its own board', () => {
    expect(dailyBoardId('2026-06-27')).not.toBe(dailyBoardId('2026-06-28'));
  });
});

describe('boardLabel', () => {
  it('labels the all-time board', () => {
    expect(boardLabel(ALLTIME_BOARD_ID)).toBe('All-time best');
  });

  it('labels a daily board with its date', () => {
    expect(boardLabel('daily-2026-06-27')).toBe('Daily Challenge · 2026-06-27');
  });

  it('passes through an unknown board id', () => {
    expect(boardLabel('weekly-x')).toBe('weekly-x');
  });
});
