import { describe, it, expect } from 'vitest';
import { attackState, PRESSURE_AT, DANGEROUS_AT, SHOT_AT } from './attackMeter';
import { POINTS_PER_GOAL, MAX_GOALS } from './scoring';

describe('attackMeter', () => {
  it('starts empty in possession', () => {
    const s = attackState(0, 0);
    expect(s.fill).toBe(0);
    expect(s.phase).toBe('possession');
    expect(s.goals).toBe(0);
    expect(s.pointsToGoal).toBe(POINTS_PER_GOAL);
    expect(s.maxed).toBe(false);
  });

  it('fill is the fraction toward the NEXT goal, not the whole score', () => {
    // One full goal + 25% into the next.
    const score = POINTS_PER_GOAL + POINTS_PER_GOAL * 0.25;
    const s = attackState(score, 0);
    expect(s.goals).toBe(1);
    expect(s.fill).toBeCloseTo(0.25, 5);
    expect(s.pointsToGoal).toBeCloseTo(POINTS_PER_GOAL * 0.75, 5);
  });

  it('steps through phases at the thresholds', () => {
    expect(attackState(POINTS_PER_GOAL * (PRESSURE_AT - 0.01)).phase).toBe('possession');
    expect(attackState(POINTS_PER_GOAL * PRESSURE_AT).phase).toBe('pressure');
    expect(attackState(POINTS_PER_GOAL * DANGEROUS_AT).phase).toBe('dangerous');
    expect(attackState(POINTS_PER_GOAL * SHOT_AT).phase).toBe('shot');
  });

  it('caps at max goals: full bar, no more to give', () => {
    const s = attackState(POINTS_PER_GOAL * MAX_GOALS + 900, 4);
    expect(s.goals).toBe(MAX_GOALS);
    expect(s.maxed).toBe(true);
    expect(s.fill).toBe(1);
    expect(s.phase).toBe('max');
    expect(s.pointsToGoal).toBe(0);
    // Even a big streak can't surge past the cap.
    expect(s.surging).toBe(false);
  });

  it('surges only on a live streak of 3+', () => {
    expect(attackState(1000, 2).surging).toBe(false);
    expect(attackState(1000, 3).surging).toBe(true);
    expect(attackState(1000, 5).surging).toBe(true);
  });

  it('never reports a fill that disagrees with the scoreline', () => {
    for (let score = 0; score <= POINTS_PER_GOAL * (MAX_GOALS + 1); score += 137) {
      const s = attackState(score);
      expect(s.fill).toBeGreaterThanOrEqual(0);
      expect(s.fill).toBeLessThanOrEqual(1);
      expect(s.goals).toBeLessThanOrEqual(MAX_GOALS);
    }
  });
});
