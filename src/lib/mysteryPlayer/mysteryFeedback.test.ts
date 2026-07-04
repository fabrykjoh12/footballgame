import { describe, it, expect } from 'vitest';
import { clueStrength, clueCommentary, MYSTERY_POOL_SIZE, type ClueFeedback } from './mysteryFeedback';

describe('clueStrength', () => {
  it('grades by fraction eliminated', () => {
    expect(clueStrength(0, 100)).toBe('Weak');
    expect(clueStrength(3, 100)).toBe('Weak'); // 3%
    expect(clueStrength(10, 100)).toBe('Useful'); // 10%
    expect(clueStrength(30, 100)).toBe('Huge'); // 30%
    expect(clueStrength(60, 100)).toBe('Killer'); // 60%
  });

  it('is Weak when nothing was eliminated or the pool was empty', () => {
    expect(clueStrength(0, 0)).toBe('Weak');
    expect(clueStrength(5, 0)).toBe('Weak');
  });
});

describe('clueCommentary', () => {
  const base: ClueFeedback = { remaining: 50, eliminated: 40, before: 90, strength: 'Huge', suspicion: 0.5 };

  it('opens the case when there is no report yet', () => {
    expect(clueCommentary({ ...base, strength: null })).toMatch(/scout report/i);
  });

  it('reports the eliminated count', () => {
    expect(clueCommentary(base)).toContain('eliminated 40 suspects');
  });

  it('singularises one suspect', () => {
    expect(clueCommentary({ ...base, eliminated: 1 })).toContain('eliminated 1 suspect.');
  });

  it('escalates as the shortlist shrinks', () => {
    expect(clueCommentary({ ...base, remaining: 1 })).toMatch(/prime suspect/i);
    expect(clueCommentary({ ...base, remaining: 3 })).toMatch(/net is closing/i);
  });

  it('notes a dead lead', () => {
    expect(clueCommentary({ ...base, eliminated: 0, strength: 'Weak' })).toMatch(/nowhere/i);
  });
});

describe('pool size', () => {
  it('is exposed and positive', () => {
    expect(MYSTERY_POOL_SIZE).toBeGreaterThan(50);
  });
});
