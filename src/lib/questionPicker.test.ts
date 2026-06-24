import { describe, it, expect } from 'vitest';
import { pickMatchQuestions, randomizeAnswerOrder, shuffle } from './questionPicker';
import { defaultSettings, difficultiesForMode } from './matchModes';
import type { MatchMode, Question } from '../types/game';

describe('shuffle', () => {
  it('keeps all elements and leaves the source untouched', () => {
    const src = [1, 2, 3, 4, 5];
    const out = shuffle(src);
    expect(out).toHaveLength(5);
    expect([...out].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5]);
    expect(src).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('randomizeAnswerOrder', () => {
  const mc: Question = {
    id: 'x',
    type: 'club_country',
    difficulty: 'easy',
    category: 'clubs',
    prompt: 'p',
    options: ['a', 'b', 'c', 'd'],
    correctAnswer: 'a',
    explanation: '',
  };

  it('always keeps the correct answer among shuffled MC options', () => {
    for (let i = 0; i < 100; i++) {
      const r = randomizeAnswerOrder({ ...mc, options: [...mc.options] });
      if (r.type !== 'higher_lower') {
        expect(r.options).toHaveLength(4);
        expect(r.options).toContain('a');
      }
    }
  });

  it('does not always leave the correct answer in slot A', () => {
    let inA = 0;
    for (let i = 0; i < 200; i++) {
      const r = randomizeAnswerOrder({ ...mc, options: [...mc.options] });
      if (r.type !== 'higher_lower' && r.options[0] === 'a') inA++;
    }
    // Would be 200 if unshuffled; expect roughly a quarter.
    expect(inA).toBeLessThan(120);
  });

  it('sorts guess_year options ascending', () => {
    const q: Question = {
      id: 'y',
      type: 'guess_year',
      difficulty: 'easy',
      category: 'history',
      prompt: 'p',
      options: ['2014', '2010', '2018', '2012'],
      correctAnswer: '2010',
      explanation: '',
    };
    const r = randomizeAnswerOrder(q);
    if (r.type === 'guess_year') {
      expect(r.options).toEqual(['2010', '2012', '2014', '2018']);
    }
  });

  it('keeps higher_lower correctAnswer valid when sides swap', () => {
    const q: Question = {
      id: 'z',
      type: 'higher_lower',
      difficulty: 'easy',
      category: 'players',
      prompt: 'more?',
      leftOption: { name: 'L', value: 10 },
      rightOption: { name: 'R', value: 2 },
      correctAnswer: 'L',
      explanation: '',
    };
    for (let i = 0; i < 50; i++) {
      const r = randomizeAnswerOrder(q);
      if (r.type === 'higher_lower') {
        expect([r.leftOption.name, r.rightOption.name]).toContain(r.correctAnswer);
      }
    }
  });
});

describe('pickMatchQuestions', () => {
  const modes: MatchMode[] = ['casual', 'serious', 'nightmare'];

  for (const mode of modes) {
    it(`${mode}: builds a valid 10-question match`, () => {
      const allowed = difficultiesForMode(mode);
      for (let i = 0; i < 25; i++) {
        const qs = pickMatchQuestions(defaultSettings(mode));
        expect(qs).toHaveLength(10);

        const counts: Record<string, number> = {};
        for (const q of qs) counts[q.type] = (counts[q.type] ?? 0) + 1;
        expect(counts).toEqual({
          who_am_i: 3,
          career_path: 3,
          higher_lower: 2,
          club_country: 1,
          guess_year: 1,
        });

        for (const q of qs) expect(allowed).toContain(q.difficulty);
        expect(new Set(qs.map((q) => q.id)).size).toBe(10);
      }
    });
  }
});
