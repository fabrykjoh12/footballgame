import { describe, it, expect } from 'vitest';
import { guessTheYearGame, YEAR_TOLERANCE } from './index.tsx';
import { createRng } from '../../lib/rng.ts';

describe('guessTheYearGame', () => {
  it('generates a payload within the allowed range', () => {
    const p = guessTheYearGame.generate(createRng(1), 'pro');
    expect(p.year).toBeGreaterThanOrEqual(p.min);
    expect(p.year).toBeLessThanOrEqual(p.max);
  });

  it('an exact guess is correct with top quality', () => {
    const p = guessTheYearGame.generate(createRng(5), 'pro');
    const o = guessTheYearGame.score(p, p.year, 500);
    expect(o.correct).toBe(true);
    expect(o.quality).toBeGreaterThan(0.8);
  });

  it('a guess within tolerance is correct; beyond it is not', () => {
    const p = guessTheYearGame.generate(createRng(8), 'pro');
    expect(guessTheYearGame.score(p, p.year + YEAR_TOLERANCE, 1000).correct).toBe(true);
    expect(guessTheYearGame.score(p, p.year + YEAR_TOLERANCE + 1, 1000).correct).toBe(false);
  });

  it('closer guesses score higher quality than far-but-valid ones', () => {
    const p = guessTheYearGame.generate(createRng(9), 'pro');
    const near = guessTheYearGame.score(p, p.year, 1000).quality;
    const edge = guessTheYearGame.score(p, p.year + YEAR_TOLERANCE, 1000).quality;
    expect(near).toBeGreaterThan(edge);
  });

  it('CPU stays within range and trends closer at higher skill', () => {
    const p = guessTheYearGame.generate(createRng(3), 'pro');
    const rng = createRng(3);
    let hiErr = 0;
    let loErr = 0;
    for (let i = 0; i < 400; i++) {
      hiErr += Math.abs(guessTheYearGame.cpuAnswer(p, 0.9, rng) - p.year);
      loErr += Math.abs(guessTheYearGame.cpuAnswer(p, 0.2, rng) - p.year);
    }
    expect(hiErr).toBeLessThan(loErr);
  });
});
