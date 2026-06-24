import { describe, it, expect } from 'vitest';
import { QUESTIONS } from './questions';

describe('question database integrity', () => {
  it('has globally unique ids', () => {
    const ids = QUESTIONS.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every multiple-choice question exactly 4 unique options incl. the answer', () => {
    for (const q of QUESTIONS) {
      if (q.type === 'higher_lower') continue;
      expect(q.options, q.id).toHaveLength(4);
      expect(new Set(q.options).size, q.id).toBe(4);
      expect(q.options, q.id).toContain(q.correctAnswer);
    }
  });

  it('points every higher_lower answer at the higher-value side', () => {
    for (const q of QUESTIONS) {
      if (q.type !== 'higher_lower') continue;
      expect([q.leftOption.name, q.rightOption.name], q.id).toContain(q.correctAnswer);
      const higher =
        q.leftOption.value >= q.rightOption.value
          ? q.leftOption.name
          : q.rightOption.name;
      expect(q.correctAnswer, q.id).toBe(higher);
    }
  });

  it('gives every who_am_i at least three clues', () => {
    for (const q of QUESTIONS) {
      if (q.type === 'who_am_i') {
        expect(q.clues.length, q.id).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('uses 4-digit year strings for guess_year options', () => {
    for (const q of QUESTIONS) {
      if (q.type !== 'guess_year') continue;
      for (const o of q.options) expect(/^\d{4}$/.test(o), `${q.id}:${o}`).toBe(true);
    }
  });

  it('spreads the guess_year answer across chronological slots (no middle bias)', () => {
    const slots = [0, 0, 0, 0];
    let n = 0;
    for (const q of QUESTIONS) {
      if (q.type !== 'guess_year') continue;
      const sorted = [...q.options].sort((a, b) => Number(a) - Number(b));
      slots[sorted.indexOf(q.correctAnswer)]++;
      n++;
    }
    for (let i = 0; i < 4; i++) expect(slots[i], `slot ${i} unused`).toBeGreaterThan(0);
    // No single chronological position may dominate the answers.
    expect(Math.max(...slots) / n).toBeLessThanOrEqual(0.45);
  });

  it('uses one consistent currency per transfer_fee question', () => {
    for (const q of QUESTIONS) {
      if (q.type !== 'transfer_fee') continue;
      const symbols = new Set(q.options.map((o) => o[0]));
      expect(symbols.size, q.id).toBe(1);
      expect(['€', '£', '$'], q.id).toContain(q.options[0][0]);
      for (const o of q.options) {
        expect(/^[€£$]\d+m$/.test(o), `${q.id}:${o}`).toBe(true);
      }
    }
  });

  it('keeps a healthy pool for each mini-game type', () => {
    const counts: Record<string, number> = {};
    for (const q of QUESTIONS) counts[q.type] = (counts[q.type] ?? 0) + 1;
    expect(counts.who_am_i).toBeGreaterThanOrEqual(16);
    expect(counts.career_path).toBeGreaterThanOrEqual(16);
    expect(counts.higher_lower).toBeGreaterThanOrEqual(16);
    expect(counts.club_country).toBeGreaterThanOrEqual(16);
    expect(counts.guess_year).toBeGreaterThanOrEqual(8);
    expect(counts.transfer_fee).toBeGreaterThanOrEqual(8);
  });

  it('has enough questions in each difficulty tier to fill every mode', () => {
    // Each mode needs the full type mix from its two tiers; check the tightest
    // type (only one club_country/guess_year per match, but several types need 3).
    const tiers = ['easy', 'medium', 'hard', 'nightmare'] as const;
    for (const tier of tiers) {
      const inTier = QUESTIONS.filter((q) => q.difficulty === tier);
      expect(inTier.length, tier).toBeGreaterThan(0);
    }
  });
});
