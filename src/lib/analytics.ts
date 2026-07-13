/**
 * Lightweight, provider-agnostic analytics.
 *
 * `trackEvent(name, payload)` is a no-op by default. In development it logs to
 * the console; in production it forwards to whatever sink you register via
 * `setAnalyticsSink` (wire PostHog / Plausible / a custom endpoint there later).
 * Analytics must NEVER break the app, so every call is wrapped in try/catch.
 *
 * Do not pass personal or sensitive data in payloads — names, emails, room
 * codes, etc. Keep payloads to counts, enums, and booleans.
 */

export type AnalyticsEvent =
  | 'first_visit'
  | 'onboarding_started'
  | 'onboarding_completed'
  | 'match_started'
  | 'match_finished'
  | 'answer_submitted'
  | 'result_shared'
  | 'friend_challenge_created'
  | 'daily_started'
  | 'daily_completed'
  | 'mode_selected';

export type AnalyticsPayload = Record<string, string | number | boolean | null | undefined>;

export type AnalyticsSink = (name: AnalyticsEvent, payload: AnalyticsPayload) => void;

let sink: AnalyticsSink | null = null;

/** Register the real analytics backend. Pass `null` to detach it again. */
export function setAnalyticsSink(fn: AnalyticsSink | null): void {
  sink = fn;
}

/** Record a product event. Safe to call from anywhere; never throws. */
export function trackEvent(name: AnalyticsEvent, payload: AnalyticsPayload = {}): void {
  try {
    if (sink) {
      sink(name, payload);
    } else if (import.meta.env?.DEV) {
      // eslint-disable-next-line no-console
      console.debug('[analytics]', name, payload);
    }
  } catch {
    /* analytics must never break the app */
  }
}
