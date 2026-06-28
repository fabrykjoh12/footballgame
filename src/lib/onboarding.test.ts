import { describe, it, expect } from 'vitest';
import { ONBOARDING_STEPS } from './onboarding';

describe('ONBOARDING_STEPS', () => {
  it('has a few well-formed steps', () => {
    expect(ONBOARDING_STEPS.length).toBeGreaterThanOrEqual(3);
    for (const s of ONBOARDING_STEPS) {
      expect(s.emoji.length).toBeGreaterThan(0);
      expect(s.title.length).toBeGreaterThan(0);
      expect(s.body.length).toBeGreaterThan(0);
    }
  });
});
