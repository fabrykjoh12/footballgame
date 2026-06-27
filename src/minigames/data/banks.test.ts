import { describe, it, expect } from 'vitest';
import { MULTIPLE_CHOICE_BANK } from './multipleChoiceBank.ts';
import { HIGHER_LOWER_BANK } from './higherLowerBank.ts';
import { CAREER_PATH_BANK } from './careerPathBank.ts';
import { ODD_ONE_OUT_BANK } from './oddOneOutBank.ts';
import {
  GUESS_THE_YEAR_BANK,
  YEAR_MIN,
  YEAR_MAX,
} from './guessTheYearBank.ts';
import { TRUE_FALSE_BANK } from './trueFalseBank.ts';

describe('multiple choice bank', () => {
  it('every question has 4 unique options and a valid answer index', () => {
    for (const q of MULTIPLE_CHOICE_BANK) {
      expect(q.prompt.length).toBeGreaterThan(0);
      expect(q.options).toHaveLength(4);
      expect(new Set(q.options).size).toBe(4);
      expect(q.answerIndex).toBeGreaterThanOrEqual(0);
      expect(q.answerIndex).toBeLessThan(4);
    }
  });
});

describe('higher / lower bank', () => {
  it('every category can produce a question (≥2 items, ≥2 distinct values)', () => {
    for (const c of HIGHER_LOWER_BANK) {
      expect(c.metric.length).toBeGreaterThan(0);
      expect(c.items.length).toBeGreaterThanOrEqual(2);
      expect(new Set(c.items.map((i) => i.value)).size).toBeGreaterThanOrEqual(2);
      for (const item of c.items) expect(Number.isFinite(item.value)).toBe(true);
    }
  });
});

describe('career path bank', () => {
  it('has enough players to fill four options', () => {
    expect(CAREER_PATH_BANK.length).toBeGreaterThanOrEqual(4);
    expect(new Set(CAREER_PATH_BANK.map((p) => p.player)).size).toBe(
      CAREER_PATH_BANK.length,
    );
  });
  it('every player has at least two clubs', () => {
    for (const p of CAREER_PATH_BANK) {
      expect(p.clubs.length).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('odd one out bank', () => {
  it('the odd one is never among the members', () => {
    for (const g of ODD_ONE_OUT_BANK) {
      expect(g.members).toHaveLength(3);
      expect(g.members).not.toContain(g.odd);
      expect(new Set(g.members).size).toBe(3);
      expect(g.reason.length).toBeGreaterThan(0);
    }
  });
});

describe('guess the year bank', () => {
  it('every year sits within the selectable range', () => {
    for (const e of GUESS_THE_YEAR_BANK) {
      expect(e.prompt.length).toBeGreaterThan(0);
      expect(e.year).toBeGreaterThanOrEqual(YEAR_MIN);
      expect(e.year).toBeLessThanOrEqual(YEAR_MAX);
    }
  });
});

describe('true / false bank', () => {
  it('every statement is non-empty with a boolean verdict', () => {
    for (const s of TRUE_FALSE_BANK) {
      expect(s.text.length).toBeGreaterThan(0);
      expect(typeof s.isTrue).toBe('boolean');
    }
  });
  it('contains a mix of true and false statements', () => {
    const trues = TRUE_FALSE_BANK.filter((s) => s.isTrue).length;
    expect(trues).toBeGreaterThan(0);
    expect(trues).toBeLessThan(TRUE_FALSE_BANK.length);
  });
});
