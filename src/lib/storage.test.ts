import { describe, it, expect, beforeEach } from 'vitest';
import { loadJSON, saveJSON, removeKey } from './storage.ts';

describe('storage helpers', () => {
  beforeEach(() => localStorage.clear());

  it('round-trips JSON values', () => {
    saveJSON('k', { a: 1, b: ['x'] });
    expect(loadJSON('k', null)).toEqual({ a: 1, b: ['x'] });
  });

  it('returns the fallback for a missing key', () => {
    expect(loadJSON('missing', 42)).toBe(42);
  });

  it('returns the fallback for corrupt JSON', () => {
    localStorage.setItem('bad', '{not json');
    expect(loadJSON('bad', 'fallback')).toBe('fallback');
  });

  it('removes a key', () => {
    saveJSON('k', 1);
    removeKey('k');
    expect(loadJSON('k', 'gone')).toBe('gone');
  });
});
