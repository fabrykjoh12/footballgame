import { describe, it, expect } from 'vitest';
import {
  normalizeManagerName,
  managersForClubPair,
  matchesManagerPair,
  pickManagerRound,
  suggestManagerNames,
  foldManagerResult,
} from './managers';
import { MANAGERS } from '../data/managers';
import { isCanonicalClub } from '../data/clubs';
import { mulberry32 } from './seededRandom';

describe('managers data integrity', () => {
  it('has unique ids and clubs that resolve to the registry', () => {
    const ids = MANAGERS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    const orphans: string[] = [];
    for (const m of MANAGERS) {
      for (const c of m.clubs) if (!isCanonicalClub(c)) orphans.push(`${m.id}: ${c}`);
    }
    expect(orphans).toEqual([]);
  });

  it('every manager has at least one club', () => {
    expect(MANAGERS.every((m) => m.clubs.length >= 1)).toBe(true);
  });
});

describe('managersForClubPair', () => {
  it('finds managers who managed both clubs', () => {
    const both = managersForClubPair('Porto', 'Chelsea').map((m) => m.id);
    expect(both).toContain('jose_mourinho');
  });
  it('resolves aliases', () => {
    const both = managersForClubPair('Inter', 'Real Madrid').map((m) => m.id);
    expect(both).toContain('jose_mourinho'); // Inter → Inter Milan
  });
  it('returns nobody for a club paired with itself', () => {
    expect(managersForClubPair('Chelsea', 'Chelsea')).toEqual([]);
  });
});

describe('matchesManagerPair', () => {
  it('accepts a correct manager (name or surname)', () => {
    expect(matchesManagerPair('Mourinho', 'Porto', 'Chelsea')).toBe(true);
    expect(matchesManagerPair('josé mourinho', 'Porto', 'Chelsea')).toBe(true);
  });
  it('rejects a manager who did not manage both', () => {
    expect(matchesManagerPair('Pep Guardiola', 'Porto', 'Chelsea')).toBe(false);
    expect(matchesManagerPair('', 'Porto', 'Chelsea')).toBe(false);
  });
});

describe('pickManagerRound', () => {
  it('builds a solvable pair (its own answer manages both)', () => {
    const round = pickManagerRound(mulberry32(3))!;
    expect(round.clubA).not.toBe(round.clubB);
    expect(matchesManagerPair(round.answer.name, round.clubA, round.clubB)).toBe(true);
  });
});

describe('suggestManagerNames / fold', () => {
  it('suggests by prefix and folds best streak', () => {
    expect(suggestManagerNames('mour').some((n) => n.includes('Mourinho'))).toBe(true);
    let p = foldManagerResult({ bestStreak: 0, played: 0 }, 4);
    expect(p).toEqual({ bestStreak: 4, played: 1 });
    p = foldManagerResult(p, 2);
    expect(p).toEqual({ bestStreak: 4, played: 2 });
  });
});
