import { describe, it, expect } from 'vitest';
import { buildShareCard } from './shareCard';
import { POINTS_PER_GOAL } from './scoring';
import type { Category, MatchMode, Player, PlayerAnswer, Question, Room } from '../types/game';

function player(id: string, over: Partial<Player> = {}): Player {
  return {
    id,
    name: id,
    isHost: id === 'a',
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

const DUR = 20_000;

function question(i: number, category: Category = 'clubs'): Question {
  return {
    id: `q${i}`,
    type: 'club_country',
    difficulty: 'easy',
    category,
    prompt: '?',
    options: ['a', 'b', 'c', 'd'],
    correctAnswer: 'a',
    explanation: '',
  };
}

function ans(playerId: string, qid: string, over: Partial<PlayerAnswer> = {}): PlayerAnswer {
  return {
    playerId,
    questionId: qid,
    selectedAnswer: 'a',
    isCorrect: true,
    answeredAt: 0,
    timeTakenMs: DUR / 2,
    pointsEarned: 0,
    clueStage: 0,
    ...over,
  };
}

function buildRoom(opts: {
  n?: number;
  mode?: MatchMode;
  isDaily?: boolean;
  a?: Partial<Player>;
  b?: Partial<Player>;
  rows?: Array<[Partial<PlayerAnswer>, Partial<PlayerAnswer>]>;
}): Room {
  const n = opts.n ?? 10;
  const selectedQuestions = Array.from({ length: n }, (_, i) => question(i));
  const answers: Record<string, PlayerAnswer[]> = {};
  (opts.rows ?? []).forEach(([ao, bo], i) => {
    answers[`q${i}`] = [ans('a', `q${i}`, ao), ans('b', `q${i}`, bo)];
  });
  return {
    roomCode: 'BK1',
    hostId: 'a',
    players: [player('a', opts.a), player('b', opts.b)],
    settings: {
      mode: opts.mode ?? 'serious',
      questionCount: n,
      questionDurationMs: DUR,
      isDaily: opts.isDaily,
    },
    currentQuestionIndex: n - 1,
    selectedQuestions,
    answers,
    scores: {},
    status: 'finished',
    questionStartedAt: null,
    lastResult: null,
    createdAt: 1,
  };
}

describe('buildShareCard — banner + basics', () => {
  it('declares a clean win', () => {
    const m = buildShareCard(buildRoom({ a: { goals: 3, score: 8000 }, b: { goals: 1, score: 4000 } }), 'a')!;
    expect(m.resultBanner).toMatch(/win$/);
    expect(m.resultBanner).not.toContain('on points');
    expect(m.onPoints).toBe(false);
    expect(m.goalsA).toBe(3);
  });

  it('notes a points decision', () => {
    const m = buildShareCard(buildRoom({ a: { goals: 2, score: 6200 }, b: { goals: 2, score: 5000 } }), 'a')!;
    expect(m.resultBanner).toContain('on points');
    expect(m.onPoints).toBe(true);
  });

  it('calls a true tie a draw', () => {
    const m = buildShareCard(buildRoom({ a: { goals: 2, score: 5000 }, b: { goals: 2, score: 5000 } }), 'a')!;
    expect(m.resultBanner).toContain('draw');
    expect(m.winnerName).toBeNull();
  });
});

describe('buildShareCard — accolades', () => {
  it('awards a perfect match for 10/10 correct', () => {
    const m = buildShareCard(
      buildRoom({ a: { goals: 4, score: 9000, correctAnswers: 10 }, b: { goals: 1 } }),
      'a',
    )!;
    expect(m.accolade?.kind).toBe('perfect');
  });

  it('flags a comeback win when the winner was 2 down', () => {
    // 'a' falls 0-2 behind early, then wins 3-2 by full time.
    const g = POINTS_PER_GOAL + 50;
    const rows: Array<[Partial<PlayerAnswer>, Partial<PlayerAnswer>]> = Array.from(
      { length: 10 },
      () => [{ pointsEarned: 0, isCorrect: false }, { pointsEarned: 0, isCorrect: false }],
    );
    rows[0] = [{ pointsEarned: 0 }, { pointsEarned: g }];
    rows[1] = [{ pointsEarned: 0 }, { pointsEarned: g }]; // b leads 0-2
    rows[7] = [{ pointsEarned: g * 3 }, { pointsEarned: 0 }]; // a surges to 3-2
    const m = buildShareCard(
      buildRoom({ rows, a: { goals: 3, score: g * 3 }, b: { goals: 2, score: g * 2 } }),
      'a',
    )!;
    expect(m.accolade?.kind).toBe('comeback');
  });

  it('flags a Nightmare win', () => {
    const m = buildShareCard(
      buildRoom({ mode: 'nightmare', a: { goals: 2, score: 6000, correctAnswers: 6 }, b: { goals: 1 } }),
      'a',
    )!;
    expect(m.accolade?.kind).toBe('nightmare');
  });

  it('falls back to a Daily badge', () => {
    const m = buildShareCard(
      buildRoom({ isDaily: true, a: { goals: 1, score: 3000, correctAnswers: 5 }, b: { goals: 2, score: 5000 } }),
      'a',
    )!;
    expect(m.accolade?.kind).toBe('daily');
  });

  it('cup win context wins over everything', () => {
    const m = buildShareCard(
      buildRoom({ a: { goals: 1, score: 3000, correctAnswers: 10 }, b: { goals: 0 } }),
      'a',
      { cupWin: { cupName: 'European Nights Cup' } },
    )!;
    expect(m.accolade?.kind).toBe('cup_win');
    expect(m.accolade?.sub).toContain('European Nights Cup');
  });

  it('promotion context is surfaced', () => {
    const m = buildShareCard(
      buildRoom({ a: { goals: 2, score: 6000, correctAnswers: 7 }, b: { goals: 1 } }),
      'a',
      { promotion: { divisionLabel: 'Championship' } },
    )!;
    expect(m.accolade?.kind).toBe('promotion');
    expect(m.accolade?.sub).toContain('Championship');
  });
});

describe('buildShareCard — correct line uses the local player', () => {
  it('reports the requesting player’s correct count', () => {
    const m = buildShareCard(
      buildRoom({ n: 10, a: { correctAnswers: 8 }, b: { correctAnswers: 3 } }),
      'b',
    )!;
    expect(m.correctLine).toBe('3/10 correct');
  });
});
