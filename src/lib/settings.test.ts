import { describe, it, expect } from 'vitest';
import { mergeSettings, DEFAULT_SETTINGS } from './settings';

describe('mergeSettings', () => {
  it('returns defaults for null/empty', () => {
    expect(mergeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(mergeSettings({})).toEqual(DEFAULT_SETTINGS);
  });

  it('overrides only the provided fields', () => {
    const s = mergeSettings({ highContrast: true, largeText: true });
    expect(s.highContrast).toBe(true);
    expect(s.largeText).toBe(true);
    expect(s.sound).toBe(DEFAULT_SETTINGS.sound);
    expect(s.reducedMotion).toBe(false);
  });

  it('keeps booleans as booleans', () => {
    const s = mergeSettings({ sound: false });
    expect(s.sound).toBe(false);
  });
});
