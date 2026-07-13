import { describe, it, expect } from 'vitest';
import { connectionBanner, demoFallbackMessage } from './connectionMessages';

describe('connectionBanner', () => {
  it('shows nothing while connected', () => {
    expect(connectionBanner('connected')).toBeNull();
    expect(connectionBanner('connected', { isGuestInMatch: true })).toBeNull();
  });

  it('uses generic reconnecting copy for a host / non-match', () => {
    expect(connectionBanner('reconnecting')).toEqual({ tone: 'warn', message: 'Reconnecting…' });
  });

  it('names the host for a guest reconnecting mid-match', () => {
    expect(connectionBanner('reconnecting', { isGuestInMatch: true })).toEqual({
      tone: 'warn',
      message: 'Host disconnected. Trying to reconnect…',
    });
  });

  it('gives a rejoin hint for a generic failure', () => {
    const b = connectionBanner('failed');
    expect(b?.tone).toBe('error');
    expect(b?.message).toContain('rejoin');
  });

  it('tells a stranded guest the host left', () => {
    const b = connectionBanner('failed', { isGuestInMatch: true });
    expect(b?.tone).toBe('error');
    expect(b?.message).toContain('Host left the match');
  });
});

describe('demoFallbackMessage', () => {
  it('explains an unconfigured build', () => {
    expect(demoFallbackMessage(false)).toContain('isn’t configured');
  });
  it('explains a failed connection when configured', () => {
    expect(demoFallbackMessage(true)).toContain('Couldn’t reach');
  });
});
