import { describe, it, expect } from 'vitest';
import { PLAYERS } from '../../data/players';
import { mulberry32 } from '../seededRandom';
import { buildScoutCatalog } from './categories';
import { cpuPickSecret, cpuChooseAction } from './cpu';
import {
  startScoutRound,
  probeRule,
  accuseRule,
  consistentCategories,
  type ScoutRound,
  type ScoutSide,
} from './engine';

const catalog = buildScoutCatalog(PLAYERS);

describe('cpuPickSecret', () => {
  it('returns a valid catalog id, deterministically for a seed', () => {
    const a = cpuPickSecret(catalog, mulberry32(42));
    const b = cpuPickSecret(catalog, mulberry32(42));
    expect(a).toBe(b);
    expect(catalog.some((c) => c.id === a)).toBe(true);
  });

  it('spreads picks across the catalog', () => {
    const picks = new Set<string>();
    for (let seed = 0; seed < 30; seed++) picks.add(cpuPickSecret(catalog, mulberry32(seed)));
    expect(picks.size).toBeGreaterThan(10);
  });
});

describe('cpuChooseAction', () => {
  it('is deterministic for a seed and always legal', () => {
    const r = startScoutRound('pos:goalkeeper', 'nat:Brazil', 'A');
    const a1 = cpuChooseAction(r, 'A', catalog, PLAYERS, mulberry32(7));
    const a2 = cpuChooseAction(r, 'A', catalog, PLAYERS, mulberry32(7));
    expect(a1).toEqual(a2);
  });

  it('never accuses a rule that contradicts its evidence', () => {
    // Give the CPU rich evidence, then check any accusation is consistent.
    for (let seed = 0; seed < 20; seed++) {
      const rng = mulberry32(seed);
      let r = startScoutRound('pos:goalkeeper', 'nat:Brazil', 'A');
      // Simulate a few CPU probes (side A hunting nat:Brazil).
      for (let i = 0; i < 6 && r.phase === 'playing'; i++) {
        const action = cpuChooseAction(r, r.turn, catalog, PLAYERS, rng);
        if (action.type === 'probe') r = probeRule(r, r.turn, action.player, catalog);
        else {
          const side: ScoutSide = r.turn;
          const consistent = consistentCategories(r.probes[side], catalog, PLAYERS).map((c) => c.id);
          expect(consistent, `seed ${seed}`).toContain(action.categoryId);
          r = accuseRule(r, side, action.categoryId, catalog);
        }
      }
    }
  });

  it('self-play converges: somebody cracks a rule within the probe budget', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const rng = mulberry32(seed);
      const secretA = cpuPickSecret(catalog, rng);
      const secretB = cpuPickSecret(catalog, rng);
      let r: ScoutRound = startScoutRound(secretA, secretB, 'A');
      let guard = 0;
      while (r.phase === 'playing' && guard++ < 120) {
        const action = cpuChooseAction(r, r.turn, catalog, PLAYERS, rng, 0.9);
        r = action.type === 'probe'
          ? probeRule(r, r.turn, action.player, catalog)
          : accuseRule(r, r.turn, action.categoryId, catalog);
      }
      expect(r.phase, `seed ${seed} did not finish`).toBe('over');
      expect(r.winner).not.toBeNull();
    }
  });
});
