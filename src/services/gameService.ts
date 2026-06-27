/**
 * Game service factory. The rest of the app talks to the `GameService`
 * interface and never cares which backend is live.
 *
 *   - "Create Room" / "Join Room" use a real-time backend when one is
 *     configured (Ably preferred, else Supabase), otherwise they fall back to
 *     the local (bot) service.
 *   - "Local Demo" always uses the local service.
 *
 * The remote backends are loaded with dynamic import() so their SDKs
 * (ably / @supabase/supabase-js) are code-split out of the main bundle and
 * only fetched when a player actually starts an online match.
 */

import type { GameService } from '../types/game';
import { isAblyConfigured, isSupabaseConfigured } from '../lib/realtimeConfig';
import { LocalGameService } from './localGameService';

export type GameIntent = 'create' | 'join' | 'demo';
export type MultiplayerProvider = 'ably' | 'supabase' | null;

/** Which real-time backend (if any) is configured in this build. */
export const multiplayerProvider: MultiplayerProvider = isAblyConfigured
  ? 'ably'
  : isSupabaseConfigured
    ? 'supabase'
    : null;

/** Whether real-time multiplayer is available in this build. */
export const multiplayerAvailable = multiplayerProvider !== null;

async function createRemoteService(): Promise<GameService> {
  if (isAblyConfigured) {
    const { AblyGameService } = await import('./ablyGameService');
    return new AblyGameService();
  }
  const { SupabaseGameService } = await import('./supabaseGameService');
  return new SupabaseGameService();
}

export interface GameServiceOptions {
  /** Career Mode: force the CPU opponent's name (local service only). */
  botName?: string;
}

export async function createGameService(
  intent: GameIntent,
  opts?: GameServiceOptions,
): Promise<GameService> {
  if (intent === 'demo') return new LocalGameService(opts);
  if (multiplayerAvailable) {
    try {
      return await createRemoteService();
    } catch {
      // Fall back gracefully if the remote client can't initialise.
      return new LocalGameService();
    }
  }
  return new LocalGameService();
}

export type { GameService };
