import { describe, it, expect } from 'vitest';
import { summarizeMatch, manOfTheMatch } from './matchStats';
import { POINTS_PER_GOAL } from './scoring';
import type { Category, Player, PlayerAnswer, Question, Room } from '../types/game';

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

function question(i: number, category: Category): Question {
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

function answer(
  playerId: string,
  questionId: string,
  over: Partial<PlayerAnswer> = {},
): PlayerAnswer {
  return {
    playerId,
    questionId,
    selectedAnswer: 'a',
    isCorrect: true,
    answeredAt: 0,
    timeTakenMs: DUR / 2,
    pointsEarned: 0,
    clueStage: 0,
    ...over,
  };
}

/** Build a room from per-question [aAnswer, bAnswer] pairs. */
function buildRoom(
  cats: Category[],
  rows: Array<[Partial<PlayerAnswer>, Partial<PlayerAnswer>]>,
  playerOver: { a?: Partial<Player>; b?: Partial<Player> } = {},
): Room {
  const selectedQuestions = cats.map((c, i) => question(i, c));
  const answers: Record<string, PlayerAnswer[]> = {};
  rows.forEach(([ao, bo], i) => {
    const qid = `q${i}`;
    answers[qid] = [answer('a', qid, ao), answer('b', qid, bo)];
  });
  return {
    roomCode: 'BK1',
    hostId: 'a',
    players: [player('a', playerOver.a), player('b', playerOver.b)],
    settings: { mode: 'serious', questionCount: cats.length, questionDurationMs: DUR },
    currentQuestionIndex: cats.length - 1,
    selectedQuestions,
    answers,
    scores: {},
    status: 'finished',
    questionStartedAt: null,
    lastResult: null,
    createdAt: 1,
  };
}

describe('summarizeMatch — per-player aggregates', () => {
  it('counts shots, chances and accuracy from the answer log', () => {
    const room = buildRoom(
      ['clubs', 'players', 'history'],
      [
        [{ isCorrect: true }, { isCorrect: false }],
        [{ isCorrect: true }, { isCorrect: false, selectedAnswer: null }],
        [{ isCorrect: false }, { isCorrect: true }],
      ],
      { a: { correctAnswers: 2 }, b: { correctAnswers: 1 } },
    );
    const s = summarizeMatch(room);
    expect(s.players['a'].total).toBe(3);
    expect(s.players['a'].chances).toBe(2); // two correct
    expect(s.players['a'].shots).toBe(3); // answered all three
    expect(s.players['b'].shots).toBe(2); // one timeout (null answer)
    expect(s.players['a'].accuracy).toBe(67);
  });

  it('computes possession-style knowledge share from points', () => {
    const room = buildRoom(
      ['clubs', 'clubs'],
      [
        [{}, {}],
        [{}, {}],
      ],
      { a: { score: 3000 }, b: { score: 1000 } },
    );
    const s = summarizeMatch(room);
    expect(s.players['a'].knowledgeShare).toBe(75);
    expect(s.players['b'].knowledgeShare).toBe(25);
  });

  it('identifies best and weakest categories', () => {
    const room = buildRoom(
      ['transfers', 'transfers', 'history', 'history'],
      [
        [{ isCorrect: true }, {}],
        [{ isCorrect: true }, {}],
        [{ isCorrect: false }, {}],
        [{ isCorrect: false }, {}],
      ],
    );
    const s = summarizeMatch(room);
    expect(s.players['a'].bestCategory?.category).toBe('transfers');
    expect(s.players['a'].bestCategory?.accuracy).toBe(100);
    expect(s.players['a'].weakestCategory?.category).toBe('history');
    expect(s.players['a'].weakestCategory?.accuracy).toBe(0);
  });

  it('flags fast correct answers as big chances', () => {
    const room = buildRoom(
      ['clubs'],
      [[{ isCorrect: true, timeTakenMs: 500 }, { isCorrect: true, timeTakenMs: DUR - 100 }]],
    );
    const s = summarizeMatch(room);
    expect(s.players['a'].bigChances).toBe(1);
    expect(s.players['b'].bigChances).toBe(0); // slow correct is not a big chance
  });
});

describe('summarizeMatch — biggest moment', () => {
  it('prefers a late winner over an earlier goal', () => {
    // 10 questions; 'a' scores a goal early, 'b' scores the decisive one late.
    const goalPts = POINTS_PER_GOAL + 100;
    const rows: Array<[Partial<PlayerAnswer>, Partial<PlayerAnswer>]> = Array.from(
      { length: 10 },
      () => [{ isCorrect: false, pointsEarned: 0 }, { isCorrect: false, pointsEarned: 0 }] as [
        Partial<PlayerAnswer>,
        Partial<PlayerAnswer>,
      ],
    );
    rows[0] = [{ pointsEarned: goalPts }, { pointsEarned: 0 }]; // a leads 1-0 early
    rows[9] = [{ pointsEarned: 0 }, { pointsEarned: goalPts * 2 }]; // b scores 2 late -> b 2-1 late winner
    const room = buildRoom(Array(10).fill('clubs'), rows);
    const s = summarizeMatch(room);
    expect(s.biggest?.kind).toBe('late_winner');
    expect(s.biggest?.playerId).toBe('b');
  });

  it('returns a timeline of marks for replay', () => {
    const room = buildRoom(
      ['clubs', 'players'],
      [
        [{ pointsEarned: POINTS_PER_GOAL + 1, isCorrect: true }, { isCorrect: false }],
        [{ isCorrect: true, timeTakenMs: 100 }, {}],
      ],
    );
    const s = summarizeMatch(room);
    expect(s.timeline.length).toBeGreaterThan(0);
    expect(s.timeline.some((m) => m.kind === 'goal')).toBe(true);
  });
});

describe('manOfTheMatch', () => {
  it('picks the higher points total', () => {
    const room = buildRoom(['clubs'], [[{}, {}]], { a: { score: 5000 }, b: { score: 9000 } });
    expect(manOfTheMatch(room)).toBe('b');
  });

  it('breaks a points tie on correct answers', () => {
    const room = buildRoom(['clubs'], [[{}, {}]], {
      a: { score: 5000, correctAnswers: 7 },
      b: { score: 5000, correctAnswers: 4 },
    });
    expect(manOfTheMatch(room)).toBe('a');
  });
});
