import { describe, it, expect } from 'vitest';
import { commentForResult, kickoffLine } from './commentaryEngine.ts';
import type { QuestionResult } from '../../types/match.ts';

const ctx = {
  playerTeam: 'Sara FC',
  opponentTeam: 'Jonas United',
  scoreline: { home: 1, away: 0 },
  playerSide: 'home' as const,
};

const result: QuestionResult = {
  index: 0,
  miniGame: 'multiple_choice',
  player: { correct: true, quality: 0.9, elapsedMs: 800 },
  opponent: { correct: false, quality: 0, elapsedMs: 1200 },
  playerGoals: 1,
  opponentGoals: 0,
};

describe('commentaryEngine', () => {
  it('mentions the scoring team on a goal', () => {
    const lines = commentForResult(result, ctx);
    expect(lines.join(' ')).toContain('Sara FC');
  });

  it('always appends a scoreline summary line', () => {
    const lines = commentForResult(result, ctx);
    expect(lines.length).toBeGreaterThanOrEqual(1);
    expect(lines.some((l) => l.includes('1') && l.includes('0'))).toBe(true);
  });

  it('produces no empty template slots', () => {
    const lines = commentForResult(result, ctx);
    for (const l of lines) expect(l).not.toMatch(/\{\w+\}/);
  });

  it('kickoff line names both teams', () => {
    const line = kickoffLine(ctx);
    expect(line).toContain('Sara FC');
    expect(line).toContain('Jonas United');
  });
});
