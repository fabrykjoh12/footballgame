import { describe, it, expect } from 'vitest';
import { trueFalseGame } from './index.tsx';
import { createRng } from '../../lib/rng.ts';

describe('trueFalseGame', () => {
  it('generates a statement with a boolean truth value', () => {
    const p = trueFalseGame.generate(createRng(1), 'pro');
    expect(typeof p.text).toBe('string');
    expect(typeof p.isTrue).toBe('boolean');
  });

  it('scores the matching verdict as correct', () => {
    const p = trueFalseGame.generate(createRng(3), 'pro');
    expect(trueFalseGame.score(p, p.isTrue, 500).correct).toBe(true);
    expect(trueFalseGame.score(p, !p.isTrue, 500).correct).toBe(false);
  });

  it('high-skill CPU answers correctly more often', () => {
    const p = trueFalseGame.generate(createRng(6), 'pro');
    const rng = createRng(6);
    let hi = 0;
    let lo = 0;
    for (let i = 0; i < 400; i++) {
      if (trueFalseGame.cpuAnswer(p, 0.9, rng) === p.isTrue) hi++;
      if (trueFalseGame.cpuAnswer(p, 0.2, rng) === p.isTrue) lo++;
    }
    expect(hi).toBeGreaterThan(lo);
  });
});
