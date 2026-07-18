/**
 * Unified "your modes" summary — one place that surfaces each solo / duel mode's
 * headline best, derived from the same `ModeProgress` snapshot the achievements
 * read. Pure (no DOM / storage), so it's testable; the component calls
 * `readModeProgress()` and passes the result in.
 *
 * This gives the modes a shared progression home: every mode you've touched
 * shows its best number, and untouched modes read as "not played yet" so there's
 * always a next thing to chase.
 */

import type { ModeProgress } from './achievements';

export interface ModeStatRow {
  key: string;
  /** Mode display name. */
  mode: string;
  /** Emoji marker (no crests/photos — house rule). */
  icon: string;
  /** What the number means, e.g. "best streak". */
  metric: string;
  value: number;
  /** True once the mode has been played (value > 0). */
  played: boolean;
}

/** Ordered headline stat per mode (best-known metric for each). */
export function buildModeStats(m: ModeProgress): ModeStatRow[] {
  const rows: Omit<ModeStatRow, 'played'>[] = [
    { key: 'rondo', mode: 'Rondo', icon: '⚽', metric: 'best run', value: m.rondoBestRun },
    { key: 'scout', mode: 'The Scout', icon: '🔍', metric: 'duels won', value: m.scoutDuelsWon },
    { key: 'connections', mode: 'Connections', icon: '🔗', metric: 'best links', value: m.connectionsBestCorrect },
    { key: 'olderYounger', mode: 'Older or Younger?', icon: '⏳', metric: 'best streak', value: m.olderYoungerBest },
    { key: 'careerPath', mode: 'Career Path', icon: '🧭', metric: 'best streak', value: m.careerPathBest },
    { key: 'managers', mode: 'Managers', icon: '📋', metric: 'best streak', value: m.managersBest },
    { key: 'survival', mode: 'Survival', icon: '🛡️', metric: 'best', value: m.survivalBest },
    { key: 'timeAttack', mode: 'Time Attack', icon: '🏁', metric: 'best score', value: m.timeAttackBest },
  ];
  return rows.map((r) => ({ ...r, played: r.value > 0 }));
}

/** How many distinct modes the player has actually played. */
export function playedModeCount(m: ModeProgress): number {
  return buildModeStats(m).filter((r) => r.played).length;
}
