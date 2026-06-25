import { describe, it, expect } from 'vitest';
import { oddOneOutGame } from './index.tsx';
import { createRng } from '../../lib/rng.ts';

describe('oddOneOutGame', () => {
  it('generates four options with a valid odd-one index', () => {
    const p = oddOneOutGame.generate(createRng(1), 'pro');
    expect(p.options).toHaveLength(4);
    expect(p.answerIndex).toBeGreaterThanOrEqual(0);
    expect(p.answerIndex).toBeLessThan(4);
  });

  it('scores the odd one out as correct', () => {
    const p = oddOneOutGame.generate(createRng(7), 'pro');
    expect(oddOneOutGame.score(p, p.answerIndex, 1000).correct).toBe(true);
    expect(oddOneOutGame.score(p, (p.answerIndex + 1) % 4, 1000).correct).toBe(false);
  });

  it('high-skill CPU is more accurate', () => {
    const p = oddOneOutGame.generate(createRng(2), 'pro');
    const rng = createRng(2);
    let hi = 0;
    let lo = 0;
    for (let i = 0; i < 400; i++) {
      if (oddOneOutGame.cpuAnswer(p, 0.9, rng) === p.answerIndex) hi++;
      if (oddOneOutGame.cpuAnswer(p, 0.2, rng) === p.answerIndex) lo++;
    }
    expect(hi).toBeGreaterThan(lo);
  });
});
