import { describe, it, expect } from 'vitest';
import { viewToHash, hashToView, type View } from './viewRoute';

const NON_HOME_VIEWS: View[] = [
  'career',
  'modes',
  'cup',
  'connections',
  'connectionsDaily',
  'mystery',
  'olderYounger',
  'careerPath',
  'managers',
  'scout',
  'scoutDaily',
];

describe('view ↔ hash mapping', () => {
  it('round-trips every non-home view', () => {
    for (const v of NON_HOME_VIEWS) {
      expect(hashToView(viewToHash(v)), v).toBe(v);
    }
  });

  it('maps home to the bare URL (empty hash)', () => {
    expect(viewToHash('home')).toBe('');
    expect(hashToView('')).toBe('home');
    expect(hashToView('#')).toBe('home');
  });

  it('uses distinct kebab-case slugs', () => {
    const hashes = NON_HOME_VIEWS.map((v) => viewToHash(v));
    expect(new Set(hashes).size).toBe(hashes.length);
    for (const h of hashes) {
      expect(h).toMatch(/^#[a-z]+(-[a-z]+)*$/);
    }
  });

  it('parses with or without the leading #', () => {
    expect(hashToView('#daily-connections')).toBe('connectionsDaily');
    expect(hashToView('daily-connections')).toBe('connectionsDaily');
    expect(hashToView('#older-younger')).toBe('olderYounger');
  });

  it('falls back to home on unknown or junk hashes', () => {
    expect(hashToView('#nonsense')).toBe('home');
    expect(hashToView('#room=BK7Q2')).toBe('home');
    expect(hashToView('  ')).toBe('home');
  });
});
