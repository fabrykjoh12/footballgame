/**
 * Supabase client bootstrap.
 *
 * Real-time multiplayer is OPTIONAL. If the Supabase env vars are present at
 * build time, the app can use `SupabaseGameService` for cross-device 1v1.
 *
 * This module imports the Supabase SDK, so it is only ever pulled in via the
 * lazily-loaded `SupabaseGameService` chunk — never in the demo bundle. The
 * SDK-free `isSupabaseConfigured` flag lives in `realtimeConfig.ts`.
 *
 * Database tables / policies are documented in SUPABASE_SETUP.md:
 *   - rooms         (one row per match room)
 *   - room_players  (players in a room)
 *   - room_answers  (every submitted answer)
 * Live play uses Realtime *broadcast* and needs none of them; the tables are
 * optional persistence only.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { supabaseAnonKey, supabaseUrl } from './realtimeConfig';

let client: SupabaseClient | null = null;

/** Lazily create (and cache) the Supabase client, or null if not configured. */
export function getSupabaseClient(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  if (!client) {
    client = createClient(supabaseUrl, supabaseAnonKey, {
      realtime: { params: { eventsPerSecond: 10 } },
    });
  }
  return client;
}
