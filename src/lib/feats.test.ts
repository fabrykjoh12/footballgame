import { describe, it, expect } from 'vitest';
import { detectMatchFeats } from './feats';
import { POINTS_PER_GOAL } from './scoring';
import type { MatchMode, Player, PlayerAnswer, Question, Room } from '../types/game';

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

function room(opts: {
  mode?: MatchMode;
  stoppageRound?: number;
  a?: Partial<Player>;
  b?: Partial<Player>;
  rows?: Array<[Partial<PlayerAnswer>, Partial<PlayerAnswer>]>;
  n?: number;
}): Room {
  const n = opts.n ?? 10;
  const selectedQuestions: Question[] = Array.from({ length: n }, (_, i) => ({
    id: `q${i}`,
    type: 'club_country',
    difficulty: 'easy',
    category: 'clubs',
    prompt: '?',
    options: ['a', 'b', 'c', 'd'],
    correctAnswer: 'a',
    explanation: '',
  }));
  const answers: Record<string, PlayerAnswer[]> = {};
  (opts.rows ?? []).forEach(([ao, bo], i) => {
    const qid = `q${i}`;
    answers[qid] = [
      { playerId: 'a', questionId: qid, selectedAnswer: 'a', isCorrect: true, answeredAt: 0, timeTakenMs: 5000, pointsEarned: 0, clueStage: 0, ...ao },
      { playerId: 'b', questionId: qid, selectedAnswer: 'a', isCorrect: true, answeredAt: 0, timeTakenMs: 5000, pointsEarned: 0, clueStage: 0, ...bo },
    ];
  });
  return {
    roomCode: 'BK1',
    hostId: 'a',
    players: [player('a', opts.a), player('b', opts.b)],
    settings: { mode: opts.mode ?? 'serious', questionCount: n, questionDurationMs: 15000 },
    currentQuestionIndex: n - 1,
    selectedQuestions,
    answers,
    scores: {},
    status: 'finished',
    questionStartedAt: null,
    lastResult: null,
    stoppageRound: opts.stoppageRound,
    createdAt: 1,
  };
}

describe('detectMatchFeats', () => {
  it('awards a perfect match for all-correct', () => {
    const feats = detectMatchFeats(
      room({ a: { correctAnswers: 10, goals: 3 }, b: { goals: 1 } }),
      'a',
    );
    expect(feats).toContain('perfect_match');
  });

  it('awards a clean sheet only on a win to nil', () => {
    expect(
      detectMatchFeats(room({ a: { goals: 2 }, b: { goals: 0 } }), 'a'),
    ).toContain('clean_sheet');
    // Lost to nil → no clean sheet.
    expect(
      detectMatchFeats(room({ a: { goals: 0 }, b: { goals: 2 } }), 'a'),
    ).not.toContain('clean_sheet');
  });

  it('awards five-star for a maximum-goal win', () => {
    expect(
      detectMatchFeats(room({ a: { goals: 5 }, b: { goals: 1 } }), 'a'),
    ).toContain('five_star');
  });

  it('awards a hat-trick of answers for a 3+ streak', () => {
    expect(
      detectMatchFeats(room({ a: { bestStreak: 4, goals: 1 }, b: { goals: 0 } }), 'a'),
    ).toContain('hat_trick_answers');
  });

  it('awards win-on-points when goals are level but points decide it', () => {
    const feats = detectMatchFeats(
      room({ a: { goals: 2, score: 6200 }, b: { goals: 2, score: 5000 } }),
      'a',
    );
    expect(feats).toContain('win_on_points');
  });

  it('awards a nightmare win', () => {
    expect(
      detectMatchFeats(room({ mode: 'nightmare', a: { goals: 2 }, b: { goals: 1 } }), 'a'),
    ).toContain('nightmare_win');
  });

  it('awards a stoppage-time winner', () => {
    expect(
      detectMatchFeats(room({ stoppageRound: 1, a: { goals: 3 }, b: { goals: 2 } }), 'a'),
    ).toContain('stoppage_winner');
  });

  it('awards a comeback when winning from two goals down', () => {
    const g = POINTS_PER_GOAL + 50;
    const rows: Array<[Partial<PlayerAnswer>, Partial<PlayerAnswer>]> = Array.from(
      { length: 10 },
      () => [{ pointsEarned: 0, isCorrect: false }, { pointsEarned: 0, isCorrect: false }],
    );
    rows[0] = [{ pointsEarned: 0 }, { pointsEarned: g }];
    rows[1] = [{ pointsEarned: 0 }, { pointsEarned: g }]; // b 0-2 up
    rows[8] = [{ pointsEarned: g * 3 }, { pointsEarned: 0 }]; // a storms to 3-2
    const feats = detectMatchFeats(
      room({ rows, a: { goals: 3, score: g * 3 }, b: { goals: 2, score: g * 2 } }),
      'a',
    );
    expect(feats).toContain('comeback');
  });

  it('gives a loser nothing but a hat-trick if earned', () => {
    const feats = detectMatchFeats(
      room({ a: { goals: 1, bestStreak: 3 }, b: { goals: 3 } }),
      'a',
    );
    expect(feats).toEqual(['hat_trick_answers']);
  });
});
