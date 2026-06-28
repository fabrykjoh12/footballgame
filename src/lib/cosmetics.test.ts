import { describe, it, expect } from 'vitest';
import {
  ACCENTS,
  PATTERNS,
  isAccentUnlocked,
  isPatternUnlocked,
  resolveSelection,
  patternCss,
  DEFAULT_SELECTION,
  type CosmeticContext,
} from './cosmetics';

const ctx = (over: Partial<CosmeticContext> = {}): CosmeticContext => ({
  matches: 0,
  wins: 0,
  bestStreak: 0,
  dailyStreak: 0,
  achievements: 0,
  trophies: 0,
  feats: new Set(),
  ...over,
});

describe('cosmetic catalogue', () => {
  it('has unique accent and pattern ids', () => {
    expect(new Set(ACCENTS.map((a) => a.id)).size).toBe(ACCENTS.length);
    expect(new Set(PATTERNS.map((p) => p.id)).size).toBe(PATTERNS.length);
  });

  it('always unlocks the defaults', () => {
    expect(isAccentUnlocked('neon', ctx())).toBe(true);
    expect(isPatternUnlocked('stripes', ctx())).toBe(true);
  });
});

describe('unlock rules', () => {
  it('gold accent needs a win', () => {
    expect(isAccentUnlocked('gold', ctx())).toBe(false);
    expect(isAccentUnlocked('gold', ctx({ wins: 1 }))).toBe(true);
  });

  it('crimson needs a comeback feat', () => {
    expect(isAccentUnlocked('crimson', ctx())).toBe(false);
    expect(isAccentUnlocked('crimson', ctx({ feats: new Set(['comeback']) }))).toBe(true);
  });

  it('hoops pattern needs a perfect match', () => {
    expect(isPatternUnlocked('hoops', ctx())).toBe(false);
    expect(isPatternUnlocked('hoops', ctx({ feats: new Set(['perfect_match']) }))).toBe(true);
  });
});

describe('resolveSelection', () => {
  it('keeps unlocked selections', () => {
    const sel = resolveSelection({ accent: 'gold', pattern: 'stripes' }, ctx({ wins: 3 }));
    expect(sel.accent).toBe('gold');
  });

  it('falls back to defaults when a piece is locked', () => {
    const sel = resolveSelection({ accent: 'gold', pattern: 'hoops' }, ctx());
    expect(sel).toEqual(DEFAULT_SELECTION);
  });

  it('falls back on an unknown id', () => {
    const sel = resolveSelection({ accent: 'nope', pattern: 'nope' }, ctx());
    expect(sel).toEqual(DEFAULT_SELECTION);
  });
});

describe('patternCss', () => {
  it('returns none for the pristine turf', () => {
    expect(patternCss('plain', '#16ff7a')).toBe('none');
  });
  it('embeds the accent colour for stripes', () => {
    expect(patternCss('stripes', '#16ff7a')).toContain('#16ff7a');
  });
});
