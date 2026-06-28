import { describe, it, expect } from 'vitest';
import {
  normalizeName,
  matchesConnection,
  acceptedPlayersFor,
  suggestNames,
  pickConnections,
  gradeConnection,
  recordConnectionsResult, // not unit-tested (storage), imported to ensure it builds
  CONNECTIONS_RUN_LENGTH,
  type Connection,
} from './connections';
import { CONNECTIONS } from '../data/connections';

void recordConnectionsResult;

const ARS_BAR = CONNECTIONS.find((c) => c.id === 'conn-ars-bar')!;
const TOT_RMA = CONNECTIONS.find((c) => c.id === 'conn-tot-rma')!;

describe('normalizeName', () => {
  it('lowercases, strips accents and punctuation', () => {
    expect(normalizeName('Thierry Henry')).toBe('thierry henry');
    expect(normalizeName('Gonzalo Higuaín')).toBe('gonzalo higuain');
    expect(normalizeName("N'Golo Kanté")).toBe('n golo kante');
    expect(normalizeName('  Mesut   Özil ')).toBe('mesut ozil');
  });
});

describe('matchesConnection', () => {
  it('accepts the exact full name (accent/case-insensitive)', () => {
    expect(matchesConnection('thierry henry', ARS_BAR)).toBe(true);
    expect(matchesConnection('Cesc Fàbregas', ARS_BAR)).toBe(true);
  });

  it('accepts a surname only', () => {
    expect(matchesConnection('Henry', ARS_BAR)).toBe(true);
    expect(matchesConnection('overmars', ARS_BAR)).toBe(true);
  });

  it('accepts a multi-word surname / trailing portion', () => {
    expect(matchesConnection('van der vaart', TOT_RMA)).toBe(true);
    expect(matchesConnection('Modric', TOT_RMA)).toBe(true);
  });

  it('accepts configured aliases', () => {
    expect(matchesConnection('Fabregas', ARS_BAR)).toBe(true);
  });

  it('rejects a non-answer, blank, or too-short input', () => {
    expect(matchesConnection('Lionel Messi', ARS_BAR)).toBe(false);
    expect(matchesConnection('', ARS_BAR)).toBe(false);
    expect(matchesConnection(null, ARS_BAR)).toBe(false);
    expect(matchesConnection('a', ARS_BAR)).toBe(false);
  });
});

describe('matchesConnection — database augmentation', () => {
  // No curated accept list at all; matching comes purely from the player DB.
  const ARS_JUV: Connection = {
    id: 'test-ars-juv',
    clubA: 'Arsenal',
    clubB: 'Juventus',
    accept: [],
    difficulty: 'medium',
  };

  it('accepts a DB player who played for both clubs, even with an empty accept list', () => {
    expect(matchesConnection('Henry', ARS_JUV)).toBe(true); // Henry: Juventus + Arsenal
    expect(matchesConnection('Patrick Vieira', ARS_JUV)).toBe(true);
  });

  it('still rejects someone who did not play for both', () => {
    expect(matchesConnection('Lionel Messi', ARS_JUV)).toBe(false);
  });

  it('resolves club aliases when deriving from the DB', () => {
    const INT_ARS: Connection = { id: 't', clubA: 'Inter', clubB: 'Arsenal', accept: [], difficulty: 'hard' };
    expect(matchesConnection('Vieira', INT_ARS)).toBe(true); // Inter → Inter Milan
  });

  it('acceptedPlayersFor unions the curated list with DB-derived names', () => {
    const accepted = acceptedPlayersFor(ARS_JUV);
    expect(accepted).toContain('Thierry Henry');
    expect(accepted).toContain('Patrick Vieira');
  });
});

describe('connection data integrity', () => {
  it('has unique ids', () => {
    const ids = CONNECTIONS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every puzzle has two distinct clubs and at least one accepted player', () => {
    for (const c of CONNECTIONS) {
      expect(c.clubA.trim().length).toBeGreaterThan(0);
      expect(c.clubB.trim().length).toBeGreaterThan(0);
      expect(c.clubA).not.toBe(c.clubB);
      expect(c.accept.length).toBeGreaterThan(0);
    }
  });

  it('every accepted player actually matches its own puzzle', () => {
    for (const c of CONNECTIONS) {
      for (const player of c.accept) {
        expect(matchesConnection(player, c)).toBe(true);
      }
    }
  });

  it('offers enough puzzles to fill a run at every difficulty ramp step', () => {
    expect(CONNECTIONS.length).toBeGreaterThanOrEqual(CONNECTIONS_RUN_LENGTH);
  });
});

describe('pickConnections', () => {
  it('builds a full run of distinct puzzles', () => {
    const run = pickConnections();
    expect(run).toHaveLength(CONNECTIONS_RUN_LENGTH);
    expect(new Set(run.map((c) => c.id)).size).toBe(run.length);
  });

  it('prefers unseen puzzles, reusing the stalest first when a tier is short', () => {
    // Tiny pool: 2 easy puzzles, one seen more recently than the other.
    const pool: Connection[] = [
      { id: 'a', clubA: 'X', clubB: 'Y', accept: ['P'], difficulty: 'easy' },
      { id: 'b', clubA: 'X', clubB: 'Z', accept: ['Q'], difficulty: 'easy' },
    ];
    // recent = [a, b] → a is older (staler) than b.
    const run = pickConnections(['a', 'b'], pool);
    expect(run[0].id).toBe('a'); // stalest reused first
  });
});

describe('gradeConnection', () => {
  it('awards base + speed + streak for a correct answer', () => {
    const g = gradeConnection(ARS_BAR, 'Henry', 1, 1); // full time left, on a streak
    expect(g.isCorrect).toBe(true);
    expect(g.breakdown.base).toBeGreaterThan(0);
    expect(g.breakdown.speedBonus).toBe(250);
    expect(g.breakdown.streakBonus).toBe(50); // newStreak = 2
    expect(g.newStreak).toBe(2);
    expect(g.breakdown.total).toBe(g.breakdown.base + 250 + 50);
  });

  it('scores zero and resets the streak on a wrong answer', () => {
    const g = gradeConnection(ARS_BAR, 'Lionel Messi', 1, 3);
    expect(g.isCorrect).toBe(false);
    expect(g.breakdown.total).toBe(0);
    expect(g.newStreak).toBe(0);
  });

  it('caps the streak bonus from four in a row', () => {
    const g = gradeConnection(ARS_BAR, 'Henry', 0, 4); // newStreak = 5
    expect(g.breakdown.streakBonus).toBe(150);
    expect(g.breakdown.speedBonus).toBe(0);
  });
});

describe('suggestNames', () => {
  it('returns spelling suggestions for a typed prefix', () => {
    const out = suggestNames('hen');
    expect(out.some((n) => normalizeName(n).includes('hen'))).toBe(true);
  });

  it('returns nothing for too-short input', () => {
    expect(suggestNames('h')).toEqual([]);
  });
});
