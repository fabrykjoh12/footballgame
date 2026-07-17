import { describe, it, expect } from 'vitest';
import { PLAYERS } from '../../data/players';
import { categoryMembers } from '../scout/categories';
import {
  rondoCatalog,
  dailyRondoCategory,
  foldRondoDaily,
  foldRondoDuel,
  hasPlayedDailyRondoToday,
  getRondoProgress,
  RONDO_MIN_POOL,
  buildRondoDailyShareText,
  buildRondoDuelShareText,
} from './daily';
import { cpuNameInRondo, type RondoDifficulty } from './cpu';
import { startRondoRally } from './engine';
import { mulberry32 } from '../seededRandom';

describe('rondo catalog + daily category', () => {
  it('only keeps categories with a healthy pool', () => {
    for (const c of rondoCatalog()) {
      expect(categoryMembers(c, PLAYERS).length, c.id).toBeGreaterThanOrEqual(RONDO_MIN_POOL);
    }
  });

  it('picks the same daily category for a given date', () => {
    expect(dailyRondoCategory('2026-07-17').id).toBe(dailyRondoCategory('2026-07-17').id);
  });

  it('varies the daily category across dates', () => {
    const ids = new Set(
      ['2026-07-17', '2026-07-18', '2026-07-19', '2026-07-20', '2026-07-21'].map(
        (d) => dailyRondoCategory(d).id,
      ),
    );
    expect(ids.size).toBeGreaterThan(1);
  });
});

describe('rondo progress folds (pure)', () => {
  it('extends the streak on a consecutive day and keeps the best run', () => {
    const base = foldRondoDaily(getRondoProgress(), 12, '2026-07-17');
    const next = foldRondoDaily(base, 8, '2026-07-18');
    expect(next.daily.streak).toBe(2);
    expect(next.daily.bestRun).toBe(12); // best run is not lowered by a worse day
    expect(next.daily.playsTotal).toBe(2);
  });

  it('resets the streak after a skipped day', () => {
    const base = foldRondoDaily(getRondoProgress(), 5, '2026-07-17');
    const gap = foldRondoDaily(base, 9, '2026-07-20');
    expect(gap.daily.streak).toBe(1);
    expect(gap.daily.bestStreak).toBe(1);
  });

  it('records a day only once', () => {
    const once = foldRondoDaily(getRondoProgress(), 5, '2026-07-17');
    const twice = foldRondoDaily(once, 99, '2026-07-17');
    expect(twice).toBe(once);
    expect(twice.daily.bestRun).toBe(5);
  });

  it('tallies duel wins and losses', () => {
    const p = foldRondoDuel(foldRondoDuel(getRondoProgress(), true), false);
    expect(p.duelsPlayed).toBe(2);
    expect(p.duelsWon).toBe(1);
  });
});

describe('rondo daily gating (pure, storage-free)', () => {
  it('reports a day as played once it has been folded in', () => {
    const fresh = { duelsPlayed: 0, duelsWon: 0, daily: { lastPlayedDate: null, streak: 0, bestStreak: 0, bestRun: 0, playsTotal: 0 } };
    expect(hasPlayedDailyRondoToday(fresh, '2026-07-17')).toBe(false);
    const after = foldRondoDaily(fresh, 10, '2026-07-17');
    expect(hasPlayedDailyRondoToday(after, '2026-07-17')).toBe(true);
  });
});

describe('rondo CPU', () => {
  const cat = dailyRondoCategory('2026-07-17');

  it('names a valid, unused, fitting player', () => {
    const rally = startRondoRally(cat.id, cat.label, 'B');
    const pick = cpuNameInRondo(rally, cat, PLAYERS, mulberry32(1), 'legend');
    expect(pick).not.toBeNull();
    expect(cat.test(pick!)).toBe(true);
  });

  it('is deterministic for a seed', () => {
    const rally = startRondoRally(cat.id, cat.label, 'B');
    const a = cpuNameInRondo(rally, cat, PLAYERS, mulberry32(3), 'legend');
    const b = cpuNameInRondo(rally, cat, PLAYERS, mulberry32(3), 'legend');
    expect(a?.id ?? null).toBe(b?.id ?? null);
  });

  it('never returns an already-used player', () => {
    const members = categoryMembers(cat, PLAYERS);
    const rally = { ...startRondoRally(cat.id, cat.label, 'B'), usedIds: members.slice(0, -1).map((m) => m.id) };
    for (let s = 0; s < 30; s++) {
      const pick = cpuNameInRondo(rally, cat, PLAYERS, mulberry32(s), 'legend');
      if (pick) expect(rally.usedIds).not.toContain(pick.id);
    }
  });

  it('is harder on lower difficulties (misses more often)', () => {
    const rally = startRondoRally(cat.id, cat.label, 'B');
    const tries = 40;
    const count = (d: RondoDifficulty) => {
      let named = 0;
      for (let s = 0; s < tries; s++) if (cpuNameInRondo(rally, cat, PLAYERS, mulberry32(s), d)) named++;
      return named;
    };
    expect(count('legend')).toBeGreaterThanOrEqual(count('casual'));
  });
});

describe('rondo share text', () => {
  it('summarises a daily run and a duel result', () => {
    expect(buildRondoDailyShareText({ run: 14, label: 'Played for Arsenal', streak: 3 })).toMatch(/14/);
    expect(buildRondoDailyShareText({ run: 14, label: 'x', streak: 3 })).toMatch(/3-day streak/);
    expect(buildRondoDuelShareText({ won: true, a: 3, b: 1 })).toMatch(/3–1/);
    expect(buildRondoDuelShareText({ won: false, a: 1, b: 3 })).toMatch(/3–1/);
  });
});
