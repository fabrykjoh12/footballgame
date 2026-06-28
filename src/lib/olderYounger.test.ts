import { describe, it, expect } from 'vitest';
import {
  olderYoungerPool,
  judgeGuess,
  pickPlayer,
  startOYRound,
  foldOYResult,
} from './olderYounger';
import { mulberry32 } from './seededRandom';

describe('olderYoungerPool', () => {
  it('only includes players with a birth year', () => {
    const pool = olderYoungerPool();
    expect(pool.length).toBeGreaterThan(20);
    expect(pool.every((p) => typeof p.birthYear === 'number')).toBe(true);
  });
});

describe('judgeGuess', () => {
  it('"older" is correct when the next is born earlier', () => {
    expect(judgeGuess(1990, 1985, 'older')).toBe(true);
    expect(judgeGuess(1990, 1985, 'younger')).toBe(false);
  });
  it('"younger" is correct when the next is born later', () => {
    expect(judgeGuess(1990, 1998, 'younger')).toBe(true);
    expect(judgeGuess(1990, 1998, 'older')).toBe(false);
  });
  it('a tie is a free pass either way', () => {
    expect(judgeGuess(1990, 1990, 'older')).toBe(true);
    expect(judgeGuess(1990, 1990, 'younger')).toBe(true);
  });
});

describe('selection', () => {
  const rng = mulberry32(42);
  it('pickPlayer respects exclusions', () => {
    const pool = olderYoungerPool();
    const first = pickPlayer(pool, rng)!;
    const second = pickPlayer(pool, rng, [first.id])!;
    expect(second.id).not.toBe(first.id);
  });

  it('startOYRound returns two distinct players with birth years', () => {
    const round = startOYRound(olderYoungerPool(), mulberry32(7))!;
    expect(round.current.id).not.toBe(round.next.id);
    expect(typeof round.current.birthYear).toBe('number');
    expect(typeof round.next.birthYear).toBe('number');
  });
});

describe('foldOYResult', () => {
  it('keeps the best streak and counts plays', () => {
    let p = foldOYResult({ bestStreak: 0, played: 0 }, 5);
    expect(p).toEqual({ bestStreak: 5, played: 1 });
    p = foldOYResult(p, 3);
    expect(p).toEqual({ bestStreak: 5, played: 2 });
    p = foldOYResult(p, 9);
    expect(p).toEqual({ bestStreak: 9, played: 3 });
  });
});
