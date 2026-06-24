import { describe, it, expect } from 'vitest';
import { simulateCpuOutcome, CPU_PROFILES } from './cpuDifficulty.ts';
import { createRng } from '../../lib/rng.ts';

describe('simulateCpuOutcome', () => {
  it('is reproducible for a given seed', () => {
    const a = simulateCpuOutcome('pro', createRng(123));
    const b = simulateCpuOutcome('pro', createRng(123));
    expect(a).toEqual(b);
  });

  it('keeps quality within [0,1] and 0 when wrong', () => {
    const rng = createRng(7);
    for (let i = 0; i < 500; i++) {
      const o = simulateCpuOutcome('legend', rng);
      expect(o.quality).toBeGreaterThanOrEqual(0);
      expect(o.quality).toBeLessThanOrEqual(1);
      if (!o.correct) expect(o.quality).toBe(0);
    }
  });

  it('legend is more accurate than casual over many trials', () => {
    const trials = 2000;
    const count = (d: 'casual' | 'legend') => {
      const rng = createRng(99);
      let c = 0;
      for (let i = 0; i < trials; i++) if (simulateCpuOutcome(d, rng).correct) c++;
      return c;
    };
    expect(count('legend')).toBeGreaterThan(count('casual'));
  });

  it('exposes a profile for every difficulty', () => {
    expect(Object.keys(CPU_PROFILES)).toEqual(['casual', 'pro', 'legend']);
  });
});
