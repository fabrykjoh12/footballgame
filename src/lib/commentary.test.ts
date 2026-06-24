import { describe, it, expect } from 'vitest';
import {
  kickoffLine,
  halftimeLine,
  fulltimeLine,
  questionCommentary,
  type Side,
} from './commentary';

const side = (over: Partial<Side> = {}): Side => ({
  name: 'Sara FC',
  isCorrect: false,
  scoredGoal: false,
  fast: false,
  hatTrick: false,
  ...over,
});

describe('questionCommentary priority', () => {
  it('a single goal includes the scorer and scoreline', () => {
    const line = questionCommentary(
      side({ name: 'Sara FC', isCorrect: true, scoredGoal: true }),
      side({ name: 'Jonas United' }),
      '2–1',
      0,
    );
    expect(line).toContain('Sara FC');
    expect(line).toContain('2–1');
  });

  it('goals at both ends mention the scoreline', () => {
    const line = questionCommentary(side({ scoredGoal: true }), side({ scoredGoal: true }), '3–3', 0);
    expect(line).toContain('3–3');
  });

  it('a hat-trick wins over a plain correct (no goal)', () => {
    const line = questionCommentary(
      side({ name: 'Jonas United', isCorrect: true, hatTrick: true }),
      side(),
      '1–0',
      0,
    );
    expect(line.toLowerCase()).toContain('hat-trick');
    expect(line).toContain('Jonas United');
  });

  it('a fast correct is a counterattack', () => {
    const line = questionCommentary(
      side({ name: 'Sara FC', isCorrect: true, fast: true }),
      side(),
      '1–1',
      1,
    );
    expect(line).toContain('Sara FC');
  });

  it('both correct and both wrong each produce a line', () => {
    expect(questionCommentary(side({ isCorrect: true }), side({ isCorrect: true }), '1–1', 2).length)
      .toBeGreaterThan(0);
    expect(questionCommentary(side(), side(), '0–0', 0).length).toBeGreaterThan(0);
  });

  it('a lone correct answer names that side', () => {
    const line = questionCommentary(
      side({ name: 'Sara FC', isCorrect: true }),
      side({ name: 'Jonas United' }),
      '1–0',
      0,
    );
    expect(line).toContain('Sara FC');
  });
});

describe('commentary helpers', () => {
  it('is deterministic for a given seed', () => {
    const a = questionCommentary(side({ isCorrect: true }), side(), '1–0', 5);
    const b = questionCommentary(side({ isCorrect: true }), side(), '1–0', 5);
    expect(a).toBe(b);
  });

  it('kickoff/halftime/fulltime return sensible text', () => {
    expect(kickoffLine(0).length).toBeGreaterThan(0);
    expect(halftimeLine('1–1', 0)).toContain('1–1');
    expect(fulltimeLine('Sara FC', true, 0)).toContain('Sara FC');
    expect(fulltimeLine('Sara FC', true, 0)).toContain('on points');
    expect(fulltimeLine(null, false, 0)).toMatch(/draw|honours/i);
  });
});
