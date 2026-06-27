import { describe, it, expect } from 'vitest';
import { pushSeen, HISTORY_LIMIT } from './questionHistory';

describe('pushSeen', () => {
  it('appends new ids, most-recent last', () => {
    expect(pushSeen(['a', 'b'], ['c', 'd'])).toEqual(['a', 'b', 'c', 'd']);
  });

  it('moves repeated ids to the recent end (no duplicates)', () => {
    expect(pushSeen(['a', 'b', 'c'], ['b', 'd'])).toEqual(['a', 'c', 'b', 'd']);
  });

  it('de-duplicates within the incoming batch', () => {
    expect(pushSeen([], ['x', 'x', 'y'])).toEqual(['x', 'y']);
  });

  it('caps to the limit, dropping the oldest', () => {
    const existing = Array.from({ length: HISTORY_LIMIT }, (_, i) => `q${i}`);
    const out = pushSeen(existing, ['new1', 'new2']);
    expect(out).toHaveLength(HISTORY_LIMIT);
    expect(out).toContain('new1');
    expect(out).toContain('new2');
    // Oldest two were evicted.
    expect(out).not.toContain('q0');
    expect(out).not.toContain('q1');
    expect(out[HISTORY_LIMIT - 1]).toBe('new2');
  });

  it('does not mutate its inputs', () => {
    const existing = ['a', 'b'];
    const incoming = ['b', 'c'];
    pushSeen(existing, incoming);
    expect(existing).toEqual(['a', 'b']);
    expect(incoming).toEqual(['b', 'c']);
  });
});
