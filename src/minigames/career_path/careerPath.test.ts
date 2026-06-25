import { describe, it, expect } from 'vitest';
import { careerPathGame } from './index.tsx';
import { createRng } from '../../lib/rng.ts';

describe('careerPathGame', () => {
  it('generates a club sequence and four distinct options', () => {
    const p = careerPathGame.generate(createRng(1), 'pro');
    expect(p.clubs.length).toBeGreaterThanOrEqual(2);
    expect(p.options).toHaveLength(4);
    expect(new Set(p.options).size).toBe(4);
    expect(p.answerIndex).toBeGreaterThanOrEqual(0);
    expect(p.answerIndex).toBeLessThan(4);
  });

  it('scores the right player as correct', () => {
    const p = careerPathGame.generate(createRng(4), 'pro');
    expect(careerPathGame.score(p, p.answerIndex, 1000).correct).toBe(true);
    expect(careerPathGame.score(p, (p.answerIndex + 1) % 4, 1000).correct).toBe(false);
  });

  it('high-skill CPU is more accurate', () => {
    const p = careerPathGame.generate(createRng(2), 'pro');
    const rng = createRng(2);
    let hi = 0;
    let lo = 0;
    for (let i = 0; i < 400; i++) {
      if (careerPathGame.cpuAnswer(p, 0.9, rng) === p.answerIndex) hi++;
      if (careerPathGame.cpuAnswer(p, 0.2, rng) === p.answerIndex) lo++;
    }
    expect(hi).toBeGreaterThan(lo);
  });
});
