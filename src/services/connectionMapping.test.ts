import { describe, it, expect } from 'vitest';
import { mapRealtimeState } from './connectionMapping';

describe('mapRealtimeState', () => {
  it('maps healthy and recovering states', () => {
    expect(mapRealtimeState('connected')).toBe('connected');
    expect(mapRealtimeState('connecting')).toBe('reconnecting');
    expect(mapRealtimeState('disconnected')).toBe('reconnecting');
    expect(mapRealtimeState('suspended')).toBe('reconnecting');
    expect(mapRealtimeState('failed')).toBe('failed');
  });

  it('ignores intentional/teardown states so no banner flashes', () => {
    expect(mapRealtimeState('initialized')).toBeNull();
    expect(mapRealtimeState('closing')).toBeNull();
    expect(mapRealtimeState('closed')).toBeNull();
    expect(mapRealtimeState('anything-else')).toBeNull();
  });
});
