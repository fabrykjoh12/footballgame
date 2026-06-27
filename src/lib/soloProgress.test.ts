import { describe, it, expect } from 'vitest';
import { applySoloResult, bestForMode, type SoloProgress } from './soloProgress';

const EMPTY: SoloProgress = {
  survivalBest: 0,
  timeAttackBest: 0,
  gauntletBest: 0,
  gauntletPerfect: false,
  soloPlays: 0,
};

describe('applySoloResult', () => {
  it('keeps the best survival run and counts plays', () => {
    let p = applySoloResult(EMPTY, { mode: 'survival', score: 4000, survived: 7 });
    expect(p.survivalBest).toBe(7);
    expect(p.soloPlays).toBe(1);
    p = applySoloResult(p, { mode: 'survival', score: 2000, survived: 4 }); // worse run
    expect(p.survivalBest).toBe(7); // unchanged
    expect(p.soloPlays).toBe(2);
  });

  it('keeps the best time-attack and gauntlet points', () => {
    let p = applySoloResult(EMPTY, { mode: 'time_attack', score: 5000, survived: 6 });
    expect(p.timeAttackBest).toBe(5000);
    p = applySoloResult(p, { mode: 'gauntlet', score: 8000, survived: 10, perfect: true });
    expect(p.gauntletBest).toBe(8000);
    expect(p.gauntletPerfect).toBe(true);
  });

  it('latches gauntletPerfect once earned', () => {
    let p = applySoloResult(EMPTY, { mode: 'gauntlet', score: 9000, survived: 10, perfect: true });
    p = applySoloResult(p, { mode: 'gauntlet', score: 3000, survived: 6, perfect: false });
    expect(p.gauntletPerfect).toBe(true);
  });
});

describe('bestForMode', () => {
  it('returns the survived count for survival and points otherwise', () => {
    const p: SoloProgress = { ...EMPTY, survivalBest: 12, timeAttackBest: 4200, gauntletBest: 7100 };
    expect(bestForMode(p, 'survival')).toBe(12);
    expect(bestForMode(p, 'time_attack')).toBe(4200);
    expect(bestForMode(p, 'gauntlet')).toBe(7100);
  });
});
