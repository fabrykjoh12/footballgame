/**
 * Supabase client bootstrap.
 *
 * Real-time multiplayer is OPTIONAL. If the two env vars below are present
 * at build time, we create a Supabase client and the app uses
 * `SupabaseGameService` for cross-device 1v1. If they're missing, the app
 * silently falls back to local demo mode (you vs a simulated opponent).
 *
 * Required env vars (see .env.example):
 *   VITE_SUPABASE_URL
 *   VITE_SUPABASE_ANON_KEY
 *
 * Database tables / policies are documented in SUPABASE_SETUP.md:
 *   - rooms         (one row per match room)
 *   - room_players  (players in a room)
 *   - room_answers  (every submitted answer)
 * Realtime should be enabled on all three tables.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as
  | string
  | undefined;

/** True only when BOTH env vars are present and non-empty. */
export const isSupabaseConfigured = Boolean(
  SUPABASE_URL && SUPABASE_ANON_KEY,
);

let client: SupabaseClient | null = null;

/** Lazily create (and cache) the Supabase client, or null if not configured. */
export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!client) {
    client = createClient(SUPABASE_URL as string, SUPABASE_ANON_KEY as string, {
      realtime: { params: { eventsPerSecond: 10 } },
    });
  }
  return client;
}
