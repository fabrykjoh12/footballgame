import { describe, it, expect } from 'vitest';
import { EMPTY_MODE_PROGRESS, type ModeProgress } from './achievements';
import { buildModeStats, playedModeCount } from './modeStats';

const some: ModeProgress = {
  ...EMPTY_MODE_PROGRESS,
  rondoBestRun: 18,
  scoutDuelsWon: 3,
  connectionsBestCorrect: 7,
  olderYoungerBest: 0,
};

describe('buildModeStats', () => {
  it('produces one headline row per mode, in a stable order', () => {
    const rows = buildModeStats(EMPTY_MODE_PROGRESS);
    expect(rows.map((r) => r.key)).toEqual([
      'rondo',
      'scout',
      'connections',
      'olderYounger',
      'careerPath',
      'managers',
      'survival',
      'timeAttack',
    ]);
    // Every row has a label, icon and metric.
    for (const r of rows) {
      expect(r.mode.length).toBeGreaterThan(0);
      expect(r.icon.length).toBeGreaterThan(0);
      expect(r.metric.length).toBeGreaterThan(0);
    }
  });

  it('marks a mode played only when its value is positive', () => {
    const rows = buildModeStats(some);
    const byKey = Object.fromEntries(rows.map((r) => [r.key, r]));
    expect(byKey.rondo.value).toBe(18);
    expect(byKey.rondo.played).toBe(true);
    expect(byKey.scout.played).toBe(true);
    expect(byKey.olderYounger.played).toBe(false);
    expect(byKey.survival.played).toBe(false);
  });

  it('a fresh player has played nothing', () => {
    expect(playedModeCount(EMPTY_MODE_PROGRESS)).toBe(0);
  });

  it('counts distinct played modes', () => {
    expect(playedModeCount(some)).toBe(3); // rondo, scout, connections
  });
});
