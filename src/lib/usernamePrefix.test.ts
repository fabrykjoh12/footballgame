import { describe, expect, it } from 'vitest';
import { PREFIX_HIGH_SENTINEL, usernamePrefixRange } from './usernamePrefix';

describe('usernamePrefixRange', () => {
  it('lower-cases and trims the term for the lower bound', () => {
    expect(usernamePrefixRange('  SaRa  ').start).toBe('sara');
  });

  it('upper bound is the term plus a high sentinel — not the bare term', () => {
    const { start, end } = usernamePrefixRange('sara');
    // The original bug used `term + ''` (=== term), collapsing the range to an
    // exact match. The end must be strictly greater so prefixes are included.
    expect(end).not.toBe(start);
    expect(end.startsWith(start)).toBe(true);
    expect(end).toBe('sara' + PREFIX_HIGH_SENTINEL);
  });

  it('the sentinel sorts after any ordinary username character', () => {
    // A concrete prefix match: "sarah" falls inside ["sara", "sara"+sentinel].
    const { start, end } = usernamePrefixRange('sara');
    expect('sarah' >= start).toBe(true);
    expect('sarah' <= end).toBe(true);
    // A non-match ("sarb") falls outside.
    expect('sarb' <= end).toBe(false);
  });

  it('an exact-length match is included at the lower bound', () => {
    const { start, end } = usernamePrefixRange('jonas');
    expect('jonas' >= start && 'jonas' <= end).toBe(true);
  });
});
