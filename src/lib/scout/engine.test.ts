import { describe, it, expect } from 'vitest';
import { PLAYERS, playerById } from '../../data/players';
import { buildScoutCatalog } from './categories';
import {
  startScoutRound,
  probeRule,
  accuseRule,
  consistentCategories,
  canProbe,
  hasProbed,
  otherSide,
  SCOUT_MAX_PROBES,
  type ScoutRound,
} from './engine';

const catalog = buildScoutCatalog(PLAYERS);
const player = (id: string) => {
  const p = playerById(id);
  if (!p) throw new Error(`test player missing: ${id}`);
  return p;
};

// A's secret: goalkeepers. B's secret: Brazil internationals.
const fresh = () => startScoutRound('pos:goalkeeper', 'nat:Brazil', 'A');

describe('scout round basics', () => {
  it('starts in play with A to move and clean books', () => {
    const r = fresh();
    expect(r.phase).toBe('playing');
    expect(r.turn).toBe('A');
    expect(r.probes.A).toEqual([]);
    expect(r.winner).toBeNull();
  });

  it('otherSide flips', () => {
    expect(otherSide('A')).toBe('B');
    expect(otherSide('B')).toBe('A');
  });
});

describe('probing', () => {
  it('answers against the OPPONENT secret and hands over the turn', () => {
    let r = fresh();
    // A probes Neymar against B's secret (Brazilians) → fits.
    r = probeRule(r, 'A', player('neymar'), catalog);
    expect(r.probes.A).toHaveLength(1);
    expect(r.probes.A[0]).toMatchObject({ playerId: 'neymar', fits: true });
    expect(r.turn).toBe('B');
    // B probes Neymar against A's secret (goalkeepers) → does not fit.
    r = probeRule(r, 'B', player('neymar'), catalog);
    expect(r.probes.B[0].fits).toBe(false);
    expect(r.turn).toBe('A');
  });

  it('rejects out-of-turn probes and repeats', () => {
    const r = fresh();
    expect(() => probeRule(r, 'B', player('neymar'), catalog)).toThrow();
    const r2 = probeRule(r, 'A', player('neymar'), catalog);
    const r3 = probeRule(r2, 'B', player('xavi'), catalog);
    expect(hasProbed(r3, 'A', 'neymar')).toBe(true);
    expect(() => probeRule(r3, 'A', player('neymar'), catalog)).toThrow();
  });

  it('caps probes per side', () => {
    let r = fresh();
    const capped: ScoutRound = {
      ...r,
      probes: {
        ...r.probes,
        A: PLAYERS.slice(0, SCOUT_MAX_PROBES).map((p) => ({ playerId: p.id, playerName: p.name, fits: false })),
      },
    };
    expect(canProbe(capped, 'A')).toBe(false);
    expect(() => probeRule(capped, 'A', player('rodri'), catalog)).toThrow();
    expect(canProbe(capped, 'B')).toBe(true);
  });
});

describe('accusations', () => {
  it('a correct accusation wins the round', () => {
    const r = accuseRule(fresh(), 'A', 'nat:Brazil', catalog);
    expect(r.phase).toBe('over');
    expect(r.winner).toBe('A');
  });

  it('a wrong accusation is recorded and costs the accuser their next turn', () => {
    let r = fresh();
    r = accuseRule(r, 'A', 'nat:Spain', catalog); // wrong (B holds nat:Brazil)
    expect(r.phase).toBe('playing');
    expect(r.accusations.A).toHaveLength(1);
    expect(r.turn).toBe('B');
    // B acts; the turn should NOT return to A — the skip is consumed.
    r = probeRule(r, 'B', player('xavi'), catalog);
    expect(r.turn).toBe('B');
    expect(r.skips.A).toBe(0);
    // B acts again; now the turn returns to A.
    r = probeRule(r, 'B', player('rodri'), catalog);
    expect(r.turn).toBe('A');
  });

  it('rejects re-accusing the same rule', () => {
    let r = fresh();
    r = accuseRule(r, 'A', 'nat:Spain', catalog);
    r = probeRule(r, 'B', player('xavi'), catalog); // consumes A's skip
    r = probeRule(r, 'B', player('rodri'), catalog); // back to A
    expect(() => accuseRule(r, 'A', 'nat:Spain', catalog)).toThrow();
  });
});

describe('consistency reasoning', () => {
  it('no evidence → everything is consistent', () => {
    expect(consistentCategories([], catalog, PLAYERS)).toHaveLength(catalog.length);
  });

  it('filters by every probe verdict and always keeps the true secret', () => {
    let r = fresh();
    r = probeRule(r, 'A', player('neymar'), catalog); // fits Brazilians
    r = probeRule(r, 'B', player('neymar'), catalog);
    r = probeRule(r, 'A', player('harry_kane'), catalog); // does not fit
    const consistent = consistentCategories(r.probes.A, catalog, PLAYERS);
    const ids = consistent.map((c) => c.id);
    expect(ids).toContain('nat:Brazil'); // the truth survives
    expect(ids).not.toContain('nat:England'); // Kane doesn't fit, so England is out
    expect(ids).not.toContain('pos:goalkeeper'); // Neymar fits, so GK-only rules are out
    expect(consistent.length).toBeLessThan(catalog.length);
  });
});
