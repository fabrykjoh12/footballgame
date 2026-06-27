/**
 * Cloud progress sync over Supabase.
 *
 * One row per user in the `progress` table (see SUPABASE_SETUP.md) holds the
 * three durable progress blobs as JSON. This module is only ever reached via a
 * dynamic import from the AuthProvider, so the Supabase SDK stays code-split out
 * of the main bundle and anonymous / unconfigured builds never load it.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ProgressSnapshot } from '../lib/progress';

const TABLE = 'progress';

/** Read the player's saved progress, or null if they have no row yet. */
export async function pullRemoteProgress(
  client: SupabaseClient,
  userId: string,
): Promise<ProgressSnapshot | null> {
  const { data, error } = await client
    .from(TABLE)
    .select('career, profile, daily')
    .eq('user_id', userId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    career: data.career ?? null,
    profile: data.profile ?? null,
    daily: data.daily ?? null,
  };
}

/** Upsert the player's progress row. */
export async function pushRemoteProgress(
  client: SupabaseClient,
  userId: string,
  snap: ProgressSnapshot,
): Promise<void> {
  await client.from(TABLE).upsert(
    {
      user_id: userId,
      career: snap.career ?? null,
      profile: snap.profile ?? null,
      daily: snap.daily ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );
}
