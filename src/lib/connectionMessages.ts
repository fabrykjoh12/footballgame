/**
 * User-facing copy for realtime connection states and demo fallbacks.
 *
 * Kept pure and separate from the components so the wording is testable and
 * lives in one place. The key idea: a guest whose HOST drops needs different
 * words ("Host disconnected…") than a host whose own network drops
 * ("Reconnecting…"), and a silent CPU fallback should be explained, not hidden.
 */

import type { ConnectionState } from '../types/game';

export interface BannerContent {
  tone: 'warn' | 'error';
  message: string;
}

export interface BannerContext {
  /** True when the local player is a guest in a live remote match. */
  isGuestInMatch: boolean;
}

/** The banner to show for a connection state, or null when all is well. */
export function connectionBanner(
  state: ConnectionState,
  ctx: BannerContext = { isGuestInMatch: false },
): BannerContent | null {
  if (state === 'connected') return null;
  if (state === 'reconnecting') {
    return {
      tone: 'warn',
      message: ctx.isGuestInMatch
        ? 'Host disconnected. Trying to reconnect…'
        : 'Reconnecting…',
    };
  }
  // 'failed'
  return {
    tone: 'error',
    message: ctx.isGuestInMatch
      ? 'Host left the match. Start a rematch or return home.'
      : 'Connection lost. Check your network and rejoin.',
  };
}

/**
 * Explain why an intended online match is actually a CPU demo. `configured`
 * is whether a realtime backend exists in this build at all.
 */
export function demoFallbackMessage(configured: boolean): string {
  return configured
    ? 'Couldn’t reach the online server — you’re playing a CPU demo instead.'
    : 'Online multiplayer isn’t configured in this build — you’re playing a CPU demo.';
}
