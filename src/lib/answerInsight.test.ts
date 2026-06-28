import { describe, it, expect } from 'vitest';
import { speedComparison, SPEED_GAP_MS, type AnswerSide } from './answerInsight';

const side = (over: Partial<AnswerSide> = {}): AnswerSide => ({
  correct: true,
  answered: true,
  timeTakenMs: 5000,
  ...over,
});

describe('speedComparison', () => {
  it('says you were faster when both correct and you were quicker', () => {
    const line = speedComparison(side({ timeTakenMs: 2000 }), side({ timeTakenMs: 5000 }), 'Jonas');
    expect(line).toBe('You answered 3.0s faster than Jonas.');
  });

  it('says the opponent was faster the other way round', () => {
    const line = speedComparison(side({ timeTakenMs: 6000 }), side({ timeTakenMs: 2000 }), 'Jonas');
    expect(line).toContain('Jonas answered 4.0s faster');
  });

  it('calls a near-tie neck and neck', () => {
    const line = speedComparison(
      side({ timeTakenMs: 5000 }),
      side({ timeTakenMs: 5000 + SPEED_GAP_MS - 1 }),
      'Jonas',
    );
    expect(line).toContain('Neck and neck');
  });

  it('notes when you got it and they did not (answered)', () => {
    const line = speedComparison(side(), side({ correct: false, answered: true }), 'Jonas');
    expect(line).toContain('guessed wrong');
  });

  it('notes when they timed out', () => {
    const line = speedComparison(side(), side({ correct: false, answered: false }), 'Jonas');
    expect(line).toContain('ran out of time');
  });

  it('notes when they got it and you did not', () => {
    const line = speedComparison(side({ correct: false }), side(), 'Jonas');
    expect(line).toContain('you didn’t');
  });

  it('returns null when both are wrong', () => {
    expect(speedComparison(side({ correct: false }), side({ correct: false }), 'Jonas')).toBeNull();
  });
});
