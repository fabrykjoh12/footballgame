import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getOpponentRecord,
  getHeadToHead,
  recordHeadToHead,
  resetHeadToHead,
  h2hKey,
  h2hSummary,
} from './headToHead';
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

function room(me: Partial<Player>, opp: Partial<Player>, createdAt = 1): Room {
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
    players: [player('me', me), player('opp', { name: 'Jonas', ...opp })],
    settings: { mode: 'casual', questionCount: 10, questionDurationMs: 15000 },
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

describe('h2hKey', () => {
  it('normalises case and whitespace', () => {
    expect(h2hKey('  Jonas  United ')).toBe('jonas united');
    expect(h2hKey('JONAS')).toBe(h2hKey('jonas'));
  });
});

describe('recordHeadToHead', () => {
  it('records a win by goals', () => {
    recordHeadToHead(room({ goals: 3 }, { goals: 1 }), 'me');
    const rec = getOpponentRecord('Jonas')!;
    expect(rec).toMatchObject({ wins: 1, draws: 0, losses: 0, goalsFor: 3, goalsAgainst: 1, played: 1 });
  });

  it('breaks a goal tie on points', () => {
    recordHeadToHead(room({ goals: 2, score: 5000 }, { goals: 2, score: 1000 }), 'me');
    expect(getOpponentRecord('Jonas')!.wins).toBe(1);
  });

  it('counts a true draw when goals and points are level', () => {
    recordHeadToHead(room({ goals: 1, score: 1000 }, { goals: 1, score: 1000 }), 'me');
    expect(getOpponentRecord('Jonas')!.draws).toBe(1);
  });

  it('accumulates across meetings and is idempotent per match', () => {
    recordHeadToHead(room({ goals: 3 }, { goals: 1 }, 1), 'me');
    recordHeadToHead(room({ goals: 0 }, { goals: 2 }, 2), 'me');
    recordHeadToHead(room({ goals: 0 }, { goals: 2 }, 2), 'me'); // same match again
    const rec = getOpponentRecord('Jonas')!;
    expect(rec.played).toBe(2);
    expect(rec.wins).toBe(1);
    expect(rec.losses).toBe(1);
  });

  it('keys different opponents separately', () => {
    recordHeadToHead(room({ goals: 1 }, { goals: 0, name: 'Sara' }, 1), 'me');
    recordHeadToHead(room({ goals: 0 }, { goals: 1, name: 'Jonas' }, 2), 'me');
    expect(Object.keys(getHeadToHead())).toHaveLength(2);
  });

  it('ignores opponents with no name', () => {
    recordHeadToHead(room({ goals: 1 }, { goals: 0, name: '  ' }, 1), 'me');
    expect(Object.keys(getHeadToHead())).toHaveLength(0);
  });
});

describe('h2hSummary', () => {
  it('formats a W–D–L line', () => {
    recordHeadToHead(room({ goals: 3 }, { goals: 1 }), 'me');
    expect(h2hSummary(getOpponentRecord('Jonas')!)).toBe('1W 0D 0L');
  });
});

describe('resetHeadToHead', () => {
  it('clears all records', () => {
    recordHeadToHead(room({ goals: 1 }, { goals: 0 }), 'me');
    resetHeadToHead();
    expect(getHeadToHead()).toEqual({});
  });
});
