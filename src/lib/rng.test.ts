import { describe, it, expect } from 'vitest';
import { createRng, seedFromString } from './rng.ts';

describe('createRng', () => {
  it('is deterministic for a given seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = Array.from({ length: 5 }, () => a.next());
    const seqB = Array.from({ length: 5 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('produces floats in [0, 1)', () => {
    const r = createRng(1);
    for (let i = 0; i < 1000; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('int respects inclusive bounds', () => {
    const r = createRng(7);
    for (let i = 0; i < 1000; i++) {
      const v = r.int(3, 6);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(6);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it('shuffle preserves all elements', () => {
    const r = createRng(9);
    const input = [1, 2, 3, 4, 5, 6];
    const out = r.shuffle(input);
    expect(out).toHaveLength(input.length);
    expect([...out].sort()).toEqual([...input].sort());
  });

  it('pick throws on empty array', () => {
    const r = createRng(1);
    expect(() => r.pick([])).toThrow();
  });

  it('chance(0) is never true and chance(1) is always true', () => {
    const r = createRng(5);
    let anyTrueAtZero = false;
    let anyFalseAtOne = false;
    for (let i = 0; i < 200; i++) {
      if (r.chance(0)) anyTrueAtZero = true;
      if (!r.chance(1)) anyFalseAtOne = true;
    }
    expect(anyTrueAtZero).toBe(false);
    expect(anyFalseAtOne).toBe(false);
  });
});

describe('seedFromString', () => {
  it('is stable and order-sensitive', () => {
    expect(seedFromString('Sara FC')).toBe(seedFromString('Sara FC'));
    expect(seedFromString('Sara FC')).not.toBe(seedFromString('Jonas United'));
  });
});
