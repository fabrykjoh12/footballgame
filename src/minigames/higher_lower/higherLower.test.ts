import { describe, it, expect } from 'vitest';
import { higherLowerGame } from './index.tsx';
import { createRng } from '../../lib/rng.ts';

describe('higherLowerGame', () => {
  it('generates two items with a determinable higher side', () => {
    const p = higherLowerGame.generate(createRng(1), 'pro');
    expect(['left', 'right']).toContain(p.higher);
    const expected = p.left.value >= p.right.value ? 'left' : 'right';
    expect(p.higher).toBe(expected);
  });

  it('scores the higher side as correct', () => {
    const p = higherLowerGame.generate(createRng(4), 'pro');
    expect(higherLowerGame.score(p, p.higher, 1000).correct).toBe(true);
    const other = p.higher === 'left' ? 'right' : 'left';
    expect(higherLowerGame.score(p, other, 1000).correct).toBe(false);
  });

  it('high-skill CPU is more accurate than low-skill', () => {
    const p = higherLowerGame.generate(createRng(2), 'pro');
    const rng = createRng(2);
    let hi = 0;
    let lo = 0;
    for (let i = 0; i < 400; i++) {
      if (higherLowerGame.cpuAnswer(p, 0.9, rng) === p.higher) hi++;
      if (higherLowerGame.cpuAnswer(p, 0.2, rng) === p.higher) lo++;
    }
    expect(hi).toBeGreaterThan(lo);
  });
});
