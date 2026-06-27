import { describe, it, expect } from 'vitest';
import { pickMatchQuestions, randomizeAnswerOrder, shuffle } from './questionPicker';
import { defaultSettings, difficultiesForMode } from './matchModes';
import type { MatchMode, MatchSettings, Question } from '../types/game';

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
          who_am_i: 1,
          career_path: 1,
          higher_lower: 1,
          club_country: 1,
          guess_year: 1,
          transfer_fee: 1,
          pitch_position: 1,
          odd_one_out: 1,
          spot_the_lie: 1,
          guess_the_number: 1,
        });

        for (const q of qs) expect(allowed).toContain(q.difficulty);
        expect(new Set(qs.map((q) => q.id)).size).toBe(10);
      }
    });
  }
});

describe('pickMatchQuestions topic filter', () => {
  it('still builds a full, difficulty-valid match for a tiny topic', () => {
    const allowed = difficultiesForMode('casual');
    for (let i = 0; i < 20; i++) {
      const qs = pickMatchQuestions({
        mode: 'casual',
        questionCount: 10,
        questionDurationMs: 15000,
        categories: ['history'],
      });
      expect(qs).toHaveLength(10);
      for (const q of qs) expect(allowed).toContain(q.difficulty);
    }
  });

  it('leans toward selected topics when the pool is rich', () => {
    for (let i = 0; i < 20; i++) {
      const qs = pickMatchQuestions({
        mode: 'casual',
        questionCount: 10,
        questionDurationMs: 15000,
        categories: ['players'],
      });
      expect(qs.filter((q) => q.category === 'players').length).toBeGreaterThanOrEqual(3);
    }
  });

  it('treats empty categories as all topics', () => {
    expect(
      pickMatchQuestions({
        mode: 'serious',
        questionCount: 10,
        questionDurationMs: 15000,
        categories: [],
      }),
    ).toHaveLength(10);
  });
});

describe('pickMatchQuestions question-history avoidance', () => {
  const TYPES: Question['type'][] = [
    'who_am_i',
    'career_path',
    'higher_lower',
    'club_country',
    'guess_year',
    'transfer_fee',
    'pitch_position',
    'odd_one_out',
    'spot_the_lie',
    'guess_the_number',
  ];

  // Two easy questions of every type, suffixed -a (to be avoided) and -b (fresh).
  const make = (type: Question['type'], suffix: string): Question => {
    const base = {
      id: `${type}-${suffix}`,
      difficulty: 'easy' as const,
      category: 'players' as const,
      explanation: '',
    };
    switch (type) {
      case 'higher_lower':
        return {
          ...base,
          type,
          prompt: 'more?',
          leftOption: { name: 'L', value: 10 },
          rightOption: { name: 'R', value: 2 },
          correctAnswer: 'L',
        };
      case 'guess_the_number':
        return { ...base, type, prompt: 'how many?', correctAnswer: '50', min: 0, max: 100 };
      case 'guess_year':
        return {
          ...base,
          type,
          prompt: 'when?',
          options: ['2010', '2012', '2014', '2016'],
          correctAnswer: '2010',
        };
      default:
        return {
          ...base,
          type,
          prompt: 'p',
          path: ['A', 'B'],
          clues: ['c1', 'c2', 'c3'],
          options: ['a', 'b', 'c', 'd'],
          correctAnswer: 'a',
        } as Question;
    }
  };

  const pool: Question[] = TYPES.flatMap((t) => [make(t, 'a'), make(t, 'b')]);
  const settings: MatchSettings = { mode: 'casual', questionCount: 10, questionDurationMs: 15000 };

  it('prefers unseen questions when fresh alternatives exist', () => {
    const recent = TYPES.map((t) => `${t}-a`); // every "-a" seen
    for (let i = 0; i < 30; i++) {
      const qs = pickMatchQuestions(settings, pool, recent);
      expect(qs).toHaveLength(10);
      // Every type had exactly one unseen option (-b); it must be the one chosen.
      for (const q of qs) expect(q.id.endsWith('-b')).toBe(true);
    }
  });

  it('still fills the match by reusing seen questions when no fresh ones remain', () => {
    const everything = pool.map((q) => q.id);
    const qs = pickMatchQuestions(settings, pool, everything);
    expect(qs).toHaveLength(10);
  });

  it('reuses the stalest question first when every option has been seen', () => {
    // For each type, "-a" was seen long ago and "-b" most recently. With both
    // seen, the oldest ("-a") must be the one served back.
    const recent = [
      ...TYPES.map((t) => `${t}-a`), // older
      ...TYPES.map((t) => `${t}-b`), // newer
    ];
    for (let i = 0; i < 20; i++) {
      const qs = pickMatchQuestions(settings, pool, recent);
      for (const q of qs) expect(q.id.endsWith('-a')).toBe(true);
    }
  });

  it('ignores history for a seeded (Daily) pick so it stays deterministic', () => {
    const seeded: MatchSettings = { ...settings, seed: 7 };
    const recentAll = pool.map((q) => q.id);
    const ids = (recent?: readonly string[]) =>
      pickMatchQuestions(seeded, pool, recent)
        .map((q) => q.id)
        .join(',');
    expect(ids(recentAll)).toEqual(ids(undefined));
  });
});

describe('pickMatchQuestions determinism (Daily Challenge)', () => {
  const layout = (qs: Question[]) =>
    qs.map((q) => {
      if (q.type === 'higher_lower') {
        return `${q.id}:${q.leftOption.name}|${q.rightOption.name}`;
      }
      if (q.type === 'guess_the_number') {
        return `${q.id}:${q.min}-${q.max}`;
      }
      return `${q.id}:${q.options.join('|')}`;
    });

  it('produces an identical match for the same seed', () => {
    const settings: MatchSettings = {
      mode: 'serious',
      questionCount: 10,
      questionDurationMs: 15000,
      seed: 99,
    };
    expect(layout(pickMatchQuestions(settings))).toEqual(
      layout(pickMatchQuestions(settings)),
    );
  });

  it('produces different matches for different seeds', () => {
    const sig = (seed: number) =>
      pickMatchQuestions({
        mode: 'serious',
        questionCount: 10,
        questionDurationMs: 15000,
        seed,
      })
        .map((q) => q.id)
        .join(',');
    const sigs = new Set([1, 2, 3, 4, 5].map(sig));
    expect(sigs.size).toBeGreaterThan(1);
  });
});
