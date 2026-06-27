import { describe, it, expect } from 'vitest';
import {
  emptyStats,
  recordMatch,
  winRate,
  accuracy,
  goalDifference,
  type PlayerStats,
} from './stats.ts';
import type { MatchSummary, QuestionResult, Side } from '../types/match.ts';

const player = {
  id: 'p',
  displayName: 'Sara',
  side: 'home' as Side,
  team: { name: 'Sara FC', primaryRgb: '0 0 0', secondaryRgb: '0 0 0' },
};
const opponent = {
  id: 'o',
  displayName: 'CPU',
  team: { name: 'Jonas United', primaryRgb: '0 0 0', secondaryRgb: '0 0 0' },
};

function result(correct: boolean): QuestionResult {
  return {
    index: 0,
    miniGame: 'multiple_choice',
    player: { correct, quality: correct ? 1 : 0, elapsedMs: 500 },
    opponent: { correct: false, quality: 0, elapsedMs: 500 },
    playerGoals: 0,
    opponentGoals: 0,
  };
}

function summary(
  winner: Side | 'draw',
  home: number,
  away: number,
  correct: number,
  total: number,
): MatchSummary {
  const results = Array.from({ length: total }, (_, i) => result(i < correct));
  return {
    scoreline: { home, away },
    winner,
    results,
    wentToTiebreaker: false,
    player,
    opponent,
  };
}

describe('recordMatch', () => {
  it('counts a win and goals from the player perspective (home)', () => {
    const s = recordMatch(emptyStats(), summary('home', 3, 1, 7, 10));
    expect(s.played).toBe(1);
    expect(s.won).toBe(1);
    expect(s.lost).toBe(0);
    expect(s.goalsFor).toBe(3);
    expect(s.goalsAgainst).toBe(1);
    expect(s.correctAnswers).toBe(7);
    expect(s.totalAnswers).toBe(10);
  });

  it('maps goals correctly when the player is away', () => {
    const awaySummary: MatchSummary = {
      ...summary('away', 1, 2, 5, 10),
      player: { ...player, side: 'away' },
    };
    const s = recordMatch(emptyStats(), awaySummary);
    expect(s.won).toBe(1);
    expect(s.goalsFor).toBe(2);
    expect(s.goalsAgainst).toBe(1);
  });

  it('tracks losses and draws', () => {
    let s = recordMatch(emptyStats(), summary('away', 0, 2, 3, 10)); // player home → loss
    s = recordMatch(s, summary('draw', 2, 2, 4, 10));
    expect(s.lost).toBe(1);
    expect(s.drawn).toBe(1);
    expect(s.won).toBe(0);
    expect(s.played).toBe(2);
  });

  it('builds and resets win streaks, remembering the best', () => {
    let s: PlayerStats = emptyStats();
    s = recordMatch(s, summary('home', 2, 0, 5, 10)); // W
    s = recordMatch(s, summary('home', 1, 0, 5, 10)); // W
    expect(s.currentStreak).toBe(2);
    expect(s.bestStreak).toBe(2);
    s = recordMatch(s, summary('away', 0, 1, 5, 10)); // L
    expect(s.currentStreak).toBe(0);
    expect(s.bestStreak).toBe(2);
    s = recordMatch(s, summary('home', 3, 0, 5, 10)); // W
    expect(s.currentStreak).toBe(1);
    expect(s.bestStreak).toBe(2);
  });
});

describe('derived metrics', () => {
  it('computes win rate and accuracy as rounded percentages', () => {
    let s = emptyStats();
    s = recordMatch(s, summary('home', 2, 0, 8, 10));
    s = recordMatch(s, summary('away', 0, 1, 6, 10));
    expect(winRate(s)).toBe(50);
    expect(accuracy(s)).toBe(70);
    expect(goalDifference(s)).toBe(2 - 1);
  });

  it('is safe with no matches played', () => {
    expect(winRate(emptyStats())).toBe(0);
    expect(accuracy(emptyStats())).toBe(0);
  });
});
