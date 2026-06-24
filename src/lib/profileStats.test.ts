import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getProfileStats,
  recordMatchResult,
  resetProfileStats,
  winRate,
  lifetimeAccuracy,
} from './profileStats';
import type { Player, Question, Room } from '../types/game';

function player(id: string, over: Partial<Player> = {}): Player {
  return {
    id,
    name: id,
    isHost: false,
    connected: true,
    score: 0,
    goals: 0,
    correctAnswers: 0,
    streak: 0,
    bestStreak: 0,
    fastestAnswerMs: null,
    ...over,
  };
}

function room(
  me: Partial<Player>,
  opp: Partial<Player>,
  createdAt = 1,
  qCount = 10,
): Room {
  const selectedQuestions: Question[] = Array.from({ length: qCount }, (_, i) => ({
    id: `q${i}`,
    type: 'club_country',
    difficulty: 'easy',
    category: 'clubs',
    prompt: '?',
    options: ['a', 'b', 'c', 'd'],
    correctAnswer: 'a',
    explanation: '',
  }));
  return {
    roomCode: 'BK1',
    hostId: 'me',
    players: [player('me', me), player('opp', opp)],
    settings: { mode: 'casual', questionCount: qCount, questionDurationMs: 15000 },
    currentQuestionIndex: 0,
    selectedQuestions,
    answers: {},
    scores: {},
    status: 'finished',
    questionStartedAt: null,
    lastResult: null,
    createdAt,
  };
}

beforeEach(() => {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  });
});
afterEach(() => vi.unstubAllGlobals());

describe('recordMatchResult', () => {
  it('records a win and accumulates lifetime stats', () => {
    const s = recordMatchResult(
      room(
        { score: 3000, goals: 2, correctAnswers: 8, bestStreak: 5, fastestAnswerMs: 1200 },
        { score: 1000, goals: 1, correctAnswers: 5 },
      ),
      'me',
    );
    expect(s.matchesPlayed).toBe(1);
    expect(s.wins).toBe(1);
    expect(s.losses).toBe(0);
    expect(s.totalCorrect).toBe(8);
    expect(s.totalQuestions).toBe(10);
    expect(s.bestStreak).toBe(5);
    expect(s.goalsScored).toBe(2);
    expect(s.fastestAnswerMs).toBe(1200);
    expect(winRate(s)).toBe(100);
    expect(lifetimeAccuracy(s)).toBe(80);
  });

  it('is idempotent for the same finished match', () => {
    const r = room({ score: 3000, goals: 2 }, { goals: 1 });
    recordMatchResult(r, 'me');
    const s = recordMatchResult(r, 'me');
    expect(s.matchesPlayed).toBe(1);
  });

  it('decides a loss by goals first, then points', () => {
    const s = recordMatchResult(room({ score: 5000, goals: 0 }, { score: 100, goals: 1 }), 'me');
    expect(s.losses).toBe(1);
    expect(s.wins).toBe(0);
  });

  it('counts a draw only when goals AND points tie', () => {
    const s = recordMatchResult(
      room({ score: 1500, goals: 1 }, { score: 1500, goals: 1 }),
      'me',
    );
    expect(s.draws).toBe(1);
  });

  it('keeps the fastest answer (min) across separate matches', () => {
    recordMatchResult(room({ goals: 1, fastestAnswerMs: 2000 }, { goals: 0 }, 1), 'me');
    const s = recordMatchResult(
      room({ goals: 1, fastestAnswerMs: 900 }, { goals: 0 }, 2),
      'me',
    );
    expect(s.matchesPlayed).toBe(2);
    expect(s.fastestAnswerMs).toBe(900);
  });
});

describe('getProfileStats / resetProfileStats', () => {
  it('starts empty and resets to empty', () => {
    expect(getProfileStats().matchesPlayed).toBe(0);
    recordMatchResult(room({ goals: 1 }, { goals: 0 }), 'me');
    expect(getProfileStats().matchesPlayed).toBe(1);
    expect(resetProfileStats().matchesPlayed).toBe(0);
    expect(getProfileStats().matchesPlayed).toBe(0);
  });
});
