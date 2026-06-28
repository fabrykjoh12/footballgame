import { describe, it, expect } from 'vitest';
import {
  normalizePlayerName,
  matchesPlayer,
  careerPathPool,
  pickCareerPlayer,
  suggestPlayerNames,
  careerPathPoints,
  foldCareerPathResult,
} from './careerPath';
import { PLAYERS } from '../data/players';
import { mulberry32 } from './seededRandom';

const henry = PLAYERS.find((p) => p.id === 'thierry_henry')!;

describe('normalizePlayerName', () => {
  it('strips accents, case and punctuation', () => {
    expect(normalizePlayerName('Thierry Henry')).toBe('thierry henry');
    expect(normalizePlayerName("N'Golo Kanté")).toBe('n golo kante');
  });
});

describe('matchesPlayer', () => {
  it('accepts the full name (accent/case-insensitive)', () => {
    expect(matchesPlayer('thierry henry', henry)).toBe(true);
    expect(matchesPlayer('THIERRY HENRY', henry)).toBe(true);
  });
  it('accepts a surname or alias', () => {
    expect(matchesPlayer('Henry', henry)).toBe(true);
  });
  it('rejects a wrong name or junk', () => {
    expect(matchesPlayer('Lionel Messi', henry)).toBe(false);
    expect(matchesPlayer('', henry)).toBe(false);
    expect(matchesPlayer('x', henry)).toBe(false);
  });
});

describe('pool & selection', () => {
  it('pool only includes players with enough clubs', () => {
    const pool = careerPathPool(3);
    expect(pool.length).toBeGreaterThan(50);
    expect(pool.every((p) => p.clubs.length >= 3)).toBe(true);
  });
  it('pickCareerPlayer respects exclusions', () => {
    const pool = careerPathPool(3);
    const a = pickCareerPlayer(pool, mulberry32(1))!;
    const b = pickCareerPlayer(pool, mulberry32(1), [a.id])!;
    expect(b.id).not.toBe(a.id);
  });
});

describe('suggestPlayerNames', () => {
  it('returns prefix matches for a query', () => {
    const s = suggestPlayerNames('thie');
    expect(s.some((n) => n.includes('Thierry'))).toBe(true);
  });
  it('returns nothing for too-short queries', () => {
    expect(suggestPlayerNames('t')).toEqual([]);
  });
});

describe('careerPathPoints', () => {
  it('pays the most when only one club is shown and least at full reveal', () => {
    expect(careerPathPoints(1, 5)).toBe(1000);
    expect(careerPathPoints(5, 5)).toBe(200);
    expect(careerPathPoints(3, 5)).toBeLessThan(1000);
    expect(careerPathPoints(3, 5)).toBeGreaterThan(200);
  });
});

describe('foldCareerPathResult', () => {
  it('keeps the best streak and score', () => {
    let p = foldCareerPathResult({ bestStreak: 0, bestScore: 0, played: 0 }, 4, 3000);
    expect(p).toEqual({ bestStreak: 4, bestScore: 3000, played: 1 });
    p = foldCareerPathResult(p, 2, 5000);
    expect(p).toEqual({ bestStreak: 4, bestScore: 5000, played: 2 });
  });
});
