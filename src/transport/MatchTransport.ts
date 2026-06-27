/**
 * The transport abstraction that unifies offline and online play.
 *
 * The match engine ONLY ever talks to this interface — never to Ably,
 * Supabase, or the CPU directly. Swapping transports is the only difference
 * between a CPU match and an online match.
 */

import type { GameMode } from '../types/match.ts';
import type { OpponentEvent, PlayerEvent } from '../types/realtime.ts';

export interface MatchTransport {
  readonly mode: GameMode;
  /** Send a player intent toward the opponent/server. */
  send(event: PlayerEvent): void;
  /** Subscribe to opponent events. Returns an unsubscribe function. */
  subscribe(handler: (event: OpponentEvent) => void): () => void;
  /** Tear down channels/timers. Safe to call more than once. */
  disconnect(): void;
  /**
   * Optionally freeze the opponent (e.g. a manual pause). The CPU transport
   * suspends pending answers; an online transport would coordinate with the
   * peer. No-op transports simply omit these.
   */
  pause?(): void;
  resume?(): void;
}

/** Runtime environment flags derived from import.meta.env. */
export interface RuntimeEnv {
  ablyKey?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
}

export function readRuntimeEnv(): RuntimeEnv {
  // Vite exposes string env vars; empty/undefined means "not configured".
  const env = (import.meta as unknown as { env?: Record<string, string> }).env ?? {};
  const env2: RuntimeEnv = {};
  if (env.VITE_ABLY_KEY) env2.ablyKey = env.VITE_ABLY_KEY;
  if (env.VITE_SUPABASE_URL) env2.supabaseUrl = env.VITE_SUPABASE_URL;
  if (env.VITE_SUPABASE_ANON_KEY) env2.supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;
  return env2;
}

/** True when at least one online provider is configured. */
export function onlineAvailable(env: RuntimeEnv): boolean {
  return Boolean(env.ablyKey || (env.supabaseUrl && env.supabaseAnonKey));
}
