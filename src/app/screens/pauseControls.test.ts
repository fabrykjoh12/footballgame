import { describe, it, expect } from 'vitest';
import { pauseKeyAction } from './pauseControls.ts';

describe('pauseKeyAction', () => {
  it('pauses on P / Escape when running', () => {
    expect(pauseKeyAction('p', false)).toBe('pause');
    expect(pauseKeyAction('P', false)).toBe('pause');
    expect(pauseKeyAction('Escape', false)).toBe('pause');
  });

  it('resumes on P / Escape when paused', () => {
    expect(pauseKeyAction('p', true)).toBe('resume');
    expect(pauseKeyAction('Escape', true)).toBe('resume');
  });

  it('ignores unrelated keys', () => {
    expect(pauseKeyAction('a', false)).toBeNull();
    expect(pauseKeyAction('Enter', true)).toBeNull();
    expect(pauseKeyAction(' ', false)).toBeNull();
  });
});
