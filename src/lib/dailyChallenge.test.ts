import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  nextStreak,
  hasPlayedToday,
  dailySettings,
  getDailyState,
  recordDailyResult,
  type DailyState,
} from './dailyChallenge';
import { todayString } from './seededRandom';
import type { Player, Question, Room } from '../types/game';

function state(partial: Partial<DailyState>): DailyState {
  return {
    lastPlayedDate: null,
    streak: 0,
    bestScore: 0,
    lastScore: 0,
    lastOutcome: null,
    playsTotal: 0,
    ...partial,
  };
}

describe('nextStreak', () => {
  it('starts at 1 on the first ever play', () => {
    expect(nextStreak(null, 0, '2026-06-24')).toBe(1);
  });

  it('increments when yesterday was played', () => {
    expect(nextStreak('2026-06-23', 4, '2026-06-24')).toBe(5);
  });

  it('resets to 1 after a missed day', () => {
    expect(nextStreak('2026-06-20', 9, '2026-06-24')).toBe(1);
  });

  it('is unchanged when already played today', () => {
    expect(nextStreak('2026-06-24', 7, '2026-06-24')).toBe(7);
  });
});

describe('hasPlayedToday', () => {
  it('compares the stored date against today', () => {
    expect(hasPlayedToday(state({ lastPlayedDate: '2026-06-24' }), '2026-06-24')).toBe(true);
    expect(hasPlayedToday(state({ lastPlayedDate: '2026-06-23' }), '2026-06-24')).toBe(false);
    expect(hasPlayedToday(state({ lastPlayedDate: null }), '2026-06-24')).toBe(false);
  });
});

describe('dailySettings', () => {
  it('is a fixed, seeded, daily-flagged config', () => {
    const s = dailySettings('2026-06-24');
    expect(s.isDaily).toBe(true);
    expect(s.questionCount).toBe(10);
    expect(typeof s.seed).toBe('number');
    // Same day → same seed; different day → different seed.
    expect(dailySettings('2026-06-24').seed).toBe(s.seed);
    expect(dailySettings('2026-06-25').seed).not.toBe(s.seed);
  });
});

function dailyRoom(me: Partial<Player>, opp: Partial<Player>): Room {
  const player = (id: string, over: Partial<Player>): Player => ({
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
  });
  const selectedQuestions: Question[] = Array.from({ length: 10 }, (_, i) => ({
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
    settings: { mode: 'serious', questionCount: 10, questionDurationMs: 15000, isDaily: true },
    currentQuestionIndex: 0,
    selectedQuestions,
    answers: {},
    scores: {},
    status: 'finished',
    questionStartedAt: null,
    lastResult: null,
    createdAt: 1,
  };
}

describe('recordDailyResult', () => {
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

  it("records today's result and is idempotent for the same day", () => {
    const r = dailyRoom({ score: 4200, goals: 3 }, { score: 1000, goals: 1 });
    const s = recordDailyResult(r, 'me');
    expect(s.lastPlayedDate).toBe(todayString());
    expect(s.lastScore).toBe(4200);
    expect(s.lastOutcome).toBe('win');
    expect(s.bestScore).toBe(4200);
    expect(s.streak).toBe(1);
    expect(s.playsTotal).toBe(1);

    // Replaying the same day must not double-count.
    const again = recordDailyResult(r, 'me');
    expect(again.playsTotal).toBe(1);
    expect(getDailyState().playsTotal).toBe(1);
  });

  it('records a loss outcome', () => {
    const s = recordDailyResult(dailyRoom({ score: 800, goals: 0 }, { score: 2000, goals: 2 }), 'me');
    expect(s.lastOutcome).toBe('loss');
  });
});
