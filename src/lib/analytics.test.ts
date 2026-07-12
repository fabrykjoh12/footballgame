import { describe, it, expect, afterEach, vi } from 'vitest';
import { trackEvent, setAnalyticsSink, type AnalyticsEvent, type AnalyticsPayload } from './analytics';

afterEach(() => setAnalyticsSink(null));

describe('trackEvent', () => {
  it('forwards the event and payload to a registered sink', () => {
    const calls: [AnalyticsEvent, AnalyticsPayload][] = [];
    setAnalyticsSink((name, payload) => calls.push([name, payload]));

    trackEvent('match_started', { mode: 'casual', vs: 'cpu' });

    expect(calls).toHaveLength(1);
    expect(calls[0][0]).toBe('match_started');
    expect(calls[0][1]).toEqual({ mode: 'casual', vs: 'cpu' });
  });

  it('defaults the payload to an empty object', () => {
    let seen: AnalyticsPayload | null = null;
    setAnalyticsSink((_n, payload) => (seen = payload));
    trackEvent('first_visit');
    expect(seen).toEqual({});
  });

  it('never throws even if the sink throws', () => {
    setAnalyticsSink(() => {
      throw new Error('sink exploded');
    });
    expect(() => trackEvent('result_shared')).not.toThrow();
  });

  it('is a no-op with no sink registered (does not throw)', () => {
    setAnalyticsSink(null);
    const spy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    expect(() => trackEvent('mode_selected', { mode: 'career' })).not.toThrow();
    spy.mockRestore();
  });
});
