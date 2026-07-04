import { describe, it, expect } from 'vitest';
import { buildMatchReport, ratePerformance, QUESTION_TYPE_LABEL } from './matchReport';
import { summarizeMatch } from './matchStats';
import type { PlayerMatchStats } from './matchStats';
import type { Player, Question, Room } from '../types/game';

function player(id: string, over: Partial<Player> = {}): Player {
  return {
    id,
    name: id,
    isHost: id === 'a',
    score: 0,
    goals: 0,
    correctAnswers: 0,
    streak: 0,
    bestStreak: 0,
    fastestAnswerMs: null,
    connected: true,
    ...over,
  };
}

function mc(id: string, type: Question['type']): Question {
  // A minimal multiple-choice question of the given type.
  return {
    id,
    type,
    category: 'general',
    difficulty: 'medium',
    prompt: id,
    options: ['W', 'X', 'Y', 'Z'],
    correctAnswer: 'W',
  } as Question;
}

function baseRoom(over: Partial<Room> = {}): Room {
  const questions = [mc('q1', 'who_am_i'), mc('q2', 'higher_lower'), mc('q3', 'club_country')];
  return {
    roomCode: 'ABCDE',
    hostId: 'a',
    players: [player('a'), player('b')],
    settings: { mode: 'casual', questionDurationMs: 18000 } as Room['settings'],
    currentQuestionIndex: 3,
    selectedQuestions: questions,
    answers: {},
    scores: { a: 0, b: 0 },
    status: 'finished',
    questionStartedAt: null,
    lastResult: null,
    ...over,
  };
}

const stat = (over: Partial<PlayerMatchStats>): PlayerMatchStats => ({
  playerId: 'a',
  goals: 0,
  points: 0,
  correct: 0,
  total: 10,
  accuracy: 0,
  bestStreak: 0,
  fastestMs: null,
  knowledgeShare: 50,
  shots: 0,
  chances: 0,
  bigChances: 0,
  bestCategory: null,
  weakestCategory: null,
  maxDeficit: 0,
  ...over,
});

describe('ratePerformance', () => {
  it('floors at 3 for a blank game and caps at 10 for a perfect one', () => {
    expect(ratePerformance(stat({ accuracy: 0 }))).toBe(3);
    expect(
      ratePerformance(stat({ accuracy: 100, goals: 5, bigChances: 5, bestStreak: 6 })),
    ).toBe(10);
  });

  it('rewards accuracy the most', () => {
    const low = ratePerformance(stat({ accuracy: 40 }));
    const high = ratePerformance(stat({ accuracy: 90 }));
    expect(high).toBeGreaterThan(low);
    expect(low).toBeGreaterThanOrEqual(3);
    expect(high).toBeLessThanOrEqual(10);
  });
});

describe('buildMatchReport', () => {
  it('scores each mini-game to whoever earned more points on it', () => {
    const room = baseRoom({
      answers: {
        q1: [
          { playerId: 'a', questionId: 'q1', selectedAnswer: 'W', isCorrect: true, answeredAt: 0, timeTakenMs: 2000, pointsEarned: 900, clueStage: 0 },
          { playerId: 'b', questionId: 'q1', selectedAnswer: 'X', isCorrect: false, answeredAt: 0, timeTakenMs: 3000, pointsEarned: 0, clueStage: 0 },
        ],
        q2: [
          { playerId: 'a', questionId: 'q2', selectedAnswer: 'X', isCorrect: false, answeredAt: 0, timeTakenMs: 2000, pointsEarned: 0, clueStage: 0 },
          { playerId: 'b', questionId: 'q2', selectedAnswer: 'W', isCorrect: true, answeredAt: 0, timeTakenMs: 1000, pointsEarned: 800, clueStage: 0 },
        ],
        // q3 unanswered by both → a tie at 0.
      },
    });
    const report = buildMatchReport(room, summarizeMatch(room));
    expect(report.duels).toHaveLength(3);
    expect(report.duels[0]).toMatchObject({ type: 'who_am_i', winner: 'a', aPoints: 900 });
    expect(report.duels[1]).toMatchObject({ winner: 'b', bPoints: 800 });
    expect(report.duels[2].winner).toBe('tie');
    expect(report.duelsWon.a).toBe(1);
    expect(report.duelsWon.b).toBe(1);
  });

  it('labels every mini-game type', () => {
    const room = baseRoom();
    const report = buildMatchReport(room, summarizeMatch(room));
    expect(report.duels[0].label).toBe(QUESTION_TYPE_LABEL.who_am_i);
    expect(report.duels[0].label).toBe('Who Am I?');
  });

  it('minutes climb across the match', () => {
    const room = baseRoom();
    const report = buildMatchReport(room, summarizeMatch(room));
    const mins = report.duels.map((d) => d.minute);
    expect(mins[0]).toBeLessThan(mins[mins.length - 1]);
  });
});
