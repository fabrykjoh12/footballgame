import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildShareText, matchHeadline, shareResultText } from './shareResult';
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

  it('includes a viral challenge line and the goals hook', () => {
    const text = buildShareText(room(player('a', 3, 8000), player('b', 2, 6000)));
    expect(text).toContain('Every answer scores goals');
    expect(text).toContain('Ball Knowledge');
  });
});

describe('matchHeadline', () => {
  it('flags a dominant win by margin', () => {
    expect(matchHeadline(room(player('a', 4, 9000), player('b', 1, 3000)))).toBe(
      'Dominant 4–1 performance.',
    );
  });

  it('calls out a points decision when level on goals', () => {
    expect(matchHeadline(room(player('a', 2, 8200), player('b', 2, 7000)))).toContain('football IQ');
  });

  it('names a genuine draw', () => {
    expect(matchHeadline(room(player('a', 2, 8000), player('b', 2, 8000)))).toContain('Honours even');
  });
});

describe('shareResultText', () => {
  const originalNavigator = globalThis.navigator;
  afterEach(() => {
    Object.defineProperty(globalThis, 'navigator', { value: originalNavigator, configurable: true });
  });

  it('uses the Web Share API when available', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(globalThis, 'navigator', { value: { share }, configurable: true });
    expect(await shareResultText('hello')).toBe('shared');
    expect(share).toHaveBeenCalledWith({ title: 'Ball Knowledge', text: 'hello' });
  });

  it('falls back to the clipboard when share is unavailable', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(globalThis, 'navigator', {
      value: { clipboard: { writeText } },
      configurable: true,
    });
    expect(await shareResultText('hi')).toBe('copied');
    expect(writeText).toHaveBeenCalledWith('hi');
  });

  it('reports failure when neither path works', async () => {
    Object.defineProperty(globalThis, 'navigator', { value: {}, configurable: true });
    expect(await shareResultText('x')).toBe('failed');
  });
});
