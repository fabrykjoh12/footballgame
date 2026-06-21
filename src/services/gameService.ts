/**
 * Game service factory. The rest of the app talks to the `GameService`
 * interface and never cares which backend is live.
 *
 *   - "Create Room" / "Join Room" use Supabase when configured, otherwise
 *     fall back to the local (bot) service.
 *   - "Local Demo" always uses the local service.
 */

import type { GameService } from '../types/game';
import { isSupabaseConfigured } from '../lib/supabaseClient';
import { LocalGameService } from './localGameService';
import { SupabaseGameService } from './supabaseGameService';

export type GameIntent = 'create' | 'join' | 'demo';

/** Whether real-time multiplayer is available in this build. */
export const multiplayerAvailable = isSupabaseConfigured;

export function createGameService(intent: GameIntent): GameService {
  if (intent === 'demo') return new LocalGameService();
  if (isSupabaseConfigured) {
    try {
      return new SupabaseGameService();
    } catch {
      // Fall back gracefully if the client can't initialise.
      return new LocalGameService();
    }
  }
  return new LocalGameService();
}

export type { GameService };
