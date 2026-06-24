import { describe, it, expect } from 'vitest';
import { teamIdentity, matchIdentities } from './teamIdentity';

describe('teamIdentity', () => {
  it('is deterministic and returns a hex colour + rgba tints', () => {
    expect(teamIdentity('Sara')).toEqual(teamIdentity('Sara'));
    const id = teamIdentity('Sara');
    expect(id.color).toMatch(/^#[0-9a-f]{6}$/i);
    expect(id.soft).toMatch(/^rgba\(/);
    expect(id.ring).toMatch(/^rgba\(/);
  });

  it('falls back gracefully for an empty name', () => {
    expect(teamIdentity('').color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('guarantees two distinct kits, even for identical names', () => {
    const [a, b] = matchIdentities('Sara', 'Sara');
    expect(a.color).not.toBe(b.color);
  });
});
