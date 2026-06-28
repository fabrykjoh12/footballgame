import { describe, it, expect } from 'vitest';
import {
  normalizeShortName,
  suggestShortName,
  defaultClubIdentity,
  validateClubIdentity,
  SHORT_MAX,
  NAME_MAX,
} from './clubIdentity';

describe('normalizeShortName', () => {
  it('uppercases, strips non-alphanumerics, and caps length', () => {
    expect(normalizeShortName('mo-d!ock united')).toBe('MODO');
    expect(normalizeShortName('ab').length).toBe(2);
    expect(normalizeShortName('abcdef').length).toBe(SHORT_MAX);
  });
});

describe('suggestShortName', () => {
  it('uses initials for multi-word names', () => {
    expect(suggestShortName('Modock United')).toBe('MU');
    expect(suggestShortName('North Bridge Athletic City')).toBe('NBAC');
  });
  it('uses leading letters for a single word', () => {
    expect(suggestShortName('Ironwell')).toBe('IRO');
  });
});

describe('defaultClubIdentity', () => {
  it('club-ifies a single-word handle', () => {
    const id = defaultClubIdentity('Sara');
    expect(id.name).toBe('Sara FC');
    expect(id.stadium).toBe('Sara Park');
    expect(id.shortName.length).toBeGreaterThanOrEqual(2);
    expect(id.primary).toMatch(/^#/);
  });
  it('keeps an already-multi-word name verbatim', () => {
    expect(defaultClubIdentity('Modock United').name).toBe('Modock United');
  });
});

describe('validateClubIdentity', () => {
  it('accepts a complete draft', () => {
    const r = validateClubIdentity({
      name: 'Modock United',
      shortName: 'MOD',
      primary: '#ef4444',
      secondary: '#ffffff',
      stadium: 'Modock Park',
      nickname: 'The Reds',
      badge: 'shield',
    });
    expect(r.ok).toBe(true);
    expect(r.errors).toEqual({});
    expect(r.identity.name).toBe('Modock United');
  });

  it('flags a missing name', () => {
    const r = validateClubIdentity({ name: '   ', shortName: 'MOD' });
    expect(r.ok).toBe(false);
    expect(r.errors.name).toBeTruthy();
  });

  it('flags a too-short tag', () => {
    const r = validateClubIdentity({ name: 'Modock United', shortName: 'M' });
    expect(r.ok).toBe(false);
    expect(r.errors.shortName).toBeTruthy();
  });

  it('flags identical primary/secondary colours', () => {
    const r = validateClubIdentity({
      name: 'Modock United',
      shortName: 'MOD',
      primary: '#ef4444',
      secondary: '#ef4444',
    });
    expect(r.ok).toBe(false);
    expect(r.errors.secondary).toBeTruthy();
  });

  it('truncates an over-long name', () => {
    const long = 'M'.repeat(NAME_MAX + 10);
    const r = validateClubIdentity({ name: long, shortName: 'MM' });
    expect(r.identity.name.length).toBe(NAME_MAX);
  });
});
