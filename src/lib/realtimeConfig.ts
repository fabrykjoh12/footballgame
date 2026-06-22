/**
 * Lightweight realtime configuration detection.
 *
 * IMPORTANT: this module must NOT import the Ably or Supabase SDKs. It only
 * reads env vars, so the heavy SDKs can be code-split into lazily-loaded
 * chunks (see `gameService.ts`) and never ship in the main/demo bundle.
 */

export const ablyApiKey = import.meta.env.VITE_ABLY_API_KEY as
  | string
  | undefined;
export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as
  | string
  | undefined;
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as
  | string
  | undefined;

export const isAblyConfigured = Boolean(ablyApiKey);
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
