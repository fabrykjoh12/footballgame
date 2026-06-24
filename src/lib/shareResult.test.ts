import { describe, it, expect } from 'vitest';
import { buildShareText } from './shareResult';
import type { Player, Question, Room } from '../types/game';

function player(id: string, goals: number, score: number): Player {
  return {
    id,
    name: id,
    isHost: id === 'a',
    connected: true,
    score,
    goals,
    correctAnswers: 5,
    streak: 0,
    bestStreak: 0,
    fastestAnswerMs: null,
  };
}

function room(a: Player, b: Player): Room {
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
    hostId: 'a',
    players: [a, b],
    settings: { mode: 'serious', questionCount: 10, questionDurationMs: 15000 },
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

describe('buildShareText result line', () => {
  it('declares a clean win when goals are decisive', () => {
    const text = buildShareText(room(player('a', 3, 8000), player('b', 2, 6000)));
    expect(text).toContain('win!');
    expect(text).not.toContain('on points');
  });

  it('notes a points decision when goals are level', () => {
    const text = buildShareText(room(player('a', 3, 8200), player('b', 3, 7600)));
    expect(text).toContain('win on points!');
  });

  it('calls a true tie (goals AND points level) a draw', () => {
    const text = buildShareText(room(player('a', 3, 8000), player('b', 3, 8000)));
    expect(text).toContain('draw');
  });
});
