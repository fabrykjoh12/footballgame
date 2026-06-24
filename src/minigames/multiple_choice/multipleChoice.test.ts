import { describe, it, expect } from 'vitest';
import { multipleChoiceGame, type MultipleChoicePayload } from './index.tsx';
import { createRng } from '../../lib/rng.ts';

describe('multipleChoiceGame', () => {
  it('generates a payload with four options and a valid answer index', () => {
    const p = multipleChoiceGame.generate(createRng(1), 'pro');
    expect(p.options).toHaveLength(4);
    expect(p.answerIndex).toBeGreaterThanOrEqual(0);
    expect(p.answerIndex).toBeLessThan(4);
  });

  it('scores the correct option as correct', () => {
    const p: MultipleChoicePayload = multipleChoiceGame.generate(createRng(5), 'pro');
    const good = multipleChoiceGame.score(p, p.answerIndex, 1000);
    expect(good.correct).toBe(true);
    const wrong = multipleChoiceGame.score(p, (p.answerIndex + 1) % 4, 1000);
    expect(wrong.correct).toBe(false);
  });

  it('rewards faster correct answers with higher quality', () => {
    const p = multipleChoiceGame.generate(createRng(8), 'pro');
    const fast = multipleChoiceGame.score(p, p.answerIndex, 500);
    const slow = multipleChoiceGame.score(p, p.answerIndex, 11000);
    expect(fast.quality).toBeGreaterThan(slow.quality);
  });

  it('high-skill CPU answers correctly more often', () => {
    const p = multipleChoiceGame.generate(createRng(2), 'legend');
    const rng = createRng(2);
    let hi = 0;
    let lo = 0;
    for (let i = 0; i < 500; i++) {
      if (multipleChoiceGame.cpuAnswer(p, 0.9, rng) === p.answerIndex) hi++;
      if (multipleChoiceGame.cpuAnswer(p, 0.2, rng) === p.answerIndex) lo++;
    }
    expect(hi).toBeGreaterThan(lo);
  });
});
