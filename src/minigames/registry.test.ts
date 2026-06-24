import { describe, it, expect } from 'vitest';
import { buildSequence, getMiniGame } from './registry.ts';
import { MINI_GAME_IDS, QUESTIONS_PER_MATCH } from '../types/match.ts';
import { createRng } from '../lib/rng.ts';

describe('buildSequence', () => {
  it('produces exactly the requested length', () => {
    const seq = buildSequence(MINI_GAME_IDS, QUESTIONS_PER_MATCH, createRng(1));
    expect(seq).toHaveLength(QUESTIONS_PER_MATCH);
  });

  it('only contains valid mini-game ids', () => {
    const seq = buildSequence(MINI_GAME_IDS, QUESTIONS_PER_MATCH, createRng(2));
    for (const id of seq) expect(MINI_GAME_IDS).toContain(id);
  });

  it('avoids immediate repeats within a bag where possible', () => {
    // With a full bag of 6 distinct ids, the first 6 should be unique.
    const seq = buildSequence(MINI_GAME_IDS, 6, createRng(3));
    expect(new Set(seq).size).toBe(6);
  });

  it('is reproducible for a given seed', () => {
    const a = buildSequence(MINI_GAME_IDS, QUESTIONS_PER_MATCH, createRng(9));
    const b = buildSequence(MINI_GAME_IDS, QUESTIONS_PER_MATCH, createRng(9));
    expect(a).toEqual(b);
  });
});

describe('getMiniGame', () => {
  it('returns a game for every id (fallback until Phase 2)', () => {
    for (const id of MINI_GAME_IDS) {
      const game = getMiniGame(id);
      expect(game).toBeDefined();
      expect(typeof game.generate).toBe('function');
    }
  });
});
