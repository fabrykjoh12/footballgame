import { describe, it, expect } from 'vitest';
import { PLAYERS } from '../../data/players';
import {
  buildScoutCatalog,
  scoutCatalog,
  scoutCategoryById,
  categoryMembers,
  normalizeScoutName,
  resolveScoutPlayer,
  suggestScoutPlayers,
  SCOUT_MIN_POOL,
  SCOUT_MAX_POOL_SHARE,
} from './categories';

describe('scout catalog', () => {
  const catalog = buildScoutCatalog(PLAYERS);

  it('is big enough to hide a rule in', () => {
    expect(catalog.length).toBeGreaterThanOrEqual(40);
  });

  it('every rule respects the pool-depth guards', () => {
    const maxPool = Math.floor(PLAYERS.length * SCOUT_MAX_POOL_SHARE);
    for (const cat of catalog) {
      const size = categoryMembers(cat, PLAYERS).length;
      expect(size, cat.id).toBeGreaterThanOrEqual(SCOUT_MIN_POOL);
      expect(size, cat.id).toBeLessThanOrEqual(maxPool);
    }
  });

  it('has unique ids and non-empty labels', () => {
    expect(new Set(catalog.map((c) => c.id)).size).toBe(catalog.length);
    for (const cat of catalog) expect(cat.label.trim().length, cat.id).toBeGreaterThan(0);
  });

  it('is deterministic', () => {
    const again = buildScoutCatalog(PLAYERS);
    expect(again.map((c) => c.id)).toEqual(catalog.map((c) => c.id));
  });

  it('covers several kinds of rule', () => {
    const kinds = new Set(catalog.map((c) => c.kind));
    expect(kinds.has('nationality')).toBe(true);
    expect(kinds.has('club')).toBe(true);
    expect(kinds.has('position')).toBe(true);
    expect(kinds.has('trophy')).toBe(true);
    expect(kinds.has('era')).toBe(true);
  });

  it('looks up categories by id (memoized catalog agrees)', () => {
    const gk = scoutCategoryById('pos:goalkeeper');
    expect(gk?.label).toBe('Goalkeepers');
    expect(scoutCatalog().map((c) => c.id)).toEqual(catalog.map((c) => c.id));
    expect(scoutCategoryById('nope:nothing')).toBeUndefined();
  });
});

describe('name normalization + resolution', () => {
  it('strips accents, case and punctuation', () => {
    expect(normalizeScoutName('Vinícius Júnior')).toBe('vinicius junior');
    expect(normalizeScoutName("N'Golo   Kanté!")).toBe('n golo kante');
  });

  it('resolves every roster player by their own full name', () => {
    for (const p of PLAYERS) {
      expect(resolveScoutPlayer(p.name, PLAYERS)?.id, p.name).toBe(p.id);
    }
  });

  it('resolves an unambiguous surname alias', () => {
    expect(resolveScoutPlayer('haaland')?.id).toBe('erling_haaland');
  });

  it('returns null for unknown names', () => {
    expect(resolveScoutPlayer('zzz not a player')).toBeNull();
    expect(resolveScoutPlayer('   ')).toBeNull();
  });
});

describe('expanded deduction axes', () => {
  const catalog = buildScoutCatalog(PLAYERS);
  const ids = new Set(catalog.map((c) => c.id));

  it('exposes the new rule kinds', () => {
    const kinds = new Set(catalog.map((c) => c.kind));
    expect(kinds.has('club-count')).toBe(true);
    expect(kinds.has('travel')).toBe(true);
    expect(kinds.has('career')).toBe(true);
  });

  it('carries the marquee rules from each new axis', () => {
    // If the roster ever shrinks a pool below the guard these will fail loudly,
    // signalling the axis needs more players rather than silently disappearing.
    expect(ids.has('clubs:5plus')).toBe(true);
    expect(ids.has('travel:continents2')).toBe(true);
    expect(ids.has('trophy:cl+wc')).toBe(true);
    expect([...ids].some((id) => id.startsWith('career:debut-'))).toBe(true);
  });

  it('one-club and journeyman rules are mutually exclusive', () => {
    const one = scoutCategoryById('clubs:one', catalog);
    const many = scoutCategoryById('clubs:5plus', catalog);
    if (one && many) {
      for (const p of PLAYERS) expect(one.test(p) && many.test(p)).toBe(false);
    }
  });

  it('a trophy-combo rule implies both underlying trophies', () => {
    const combo = scoutCategoryById('trophy:cl+wc', catalog);
    expect(combo).toBeDefined();
    for (const p of PLAYERS) {
      if (combo!.test(p)) {
        expect(p.trophies.championsLeague).toBe(true);
        expect(p.trophies.worldCup).toBe(true);
      }
    }
  });
});

describe('probe suggestions', () => {
  it('suggests full names for a partial query', () => {
    expect(suggestScoutPlayers('sala')).toContain('Mohamed Salah');
  });

  it('needs at least two characters and caps results', () => {
    expect(suggestScoutPlayers('s')).toEqual([]);
    expect(suggestScoutPlayers('a', 6).length).toBe(0);
    expect(suggestScoutPlayers('ma', 4).length).toBeLessThanOrEqual(4);
  });
});
