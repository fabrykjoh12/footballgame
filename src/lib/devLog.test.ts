import { describe, it, expect, vi } from 'vitest';
import { devWarn } from './devLog';

describe('devWarn', () => {
  it('never throws, regardless of environment', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(() => devWarn('scope', 'something failed', new Error('x'))).not.toThrow();
    expect(() => devWarn('scope', 'no error object')).not.toThrow();
    spy.mockRestore();
  });
});
