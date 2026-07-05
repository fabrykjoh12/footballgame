import { describe, it, expect } from 'vitest';
import {
  BOT_PROFILES,
  profileForName,
  botAccuracyFor,
  STRONG_BONUS,
  WEAK_PENALTY,
} from './botProfiles';

describe('botProfiles', () => {
  it('every profile has distinct strong and weak mini-games', () => {
    for (const p of BOT_PROFILES) {
      expect(p.strong.length).toBeGreaterThan(0);
      expect(p.weak.length).toBeGreaterThan(0);
      for (const s of p.strong) expect(p.weak).not.toContain(s);
    }
  });

  it('maps a name to a stable profile', () => {
    const a = profileForName('Northbank FC');
    const b = profileForName('Northbank FC');
    expect(a.id).toBe(b.id);
    // Different names generally land on different personas across the pool.
    const personas = new Set(
      ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf'].map((n) => profileForName(n).id),
    );
    expect(personas.size).toBeGreaterThan(1);
  });

  it('is resilient to empty / whitespace names', () => {
    expect(profileForName('').persona).toBeTruthy();
    expect(profileForName('   ').persona).toBeTruthy();
  });

  it('lifts accuracy on strong games and drops it on weak ones', () => {
    const p = BOT_PROFILES.find((x) => x.id === 'transfer_guru')!;
    const base = 0.5;
    expect(botAccuracyFor(base, p, 'transfer_fee')).toBeCloseTo(base + p.bias + STRONG_BONUS, 5);
    expect(botAccuracyFor(base, p, 'pitch_position')).toBeCloseTo(base + p.bias - WEAK_PENALTY, 5);
    // A neutral mini-game is just the base (+ bias).
    expect(botAccuracyFor(base, p, 'club_country')).toBeCloseTo(base + p.bias, 5);
  });

  it('clamps accuracy into a sane band', () => {
    const p = BOT_PROFILES[0];
    expect(botAccuracyFor(0.99, p, p.strong[0])).toBeLessThanOrEqual(0.95);
    expect(botAccuracyFor(0.05, p, p.weak[0])).toBeGreaterThanOrEqual(0.08);
  });
});
