/**
 * Ably Realtime client bootstrap (alternative to Supabase).
 *
 * Real-time multiplayer is OPTIONAL. If `VITE_ABLY_API_KEY` is present at
 * build time, the app uses `AblyGameService` for cross-device 1v1. Ably needs
 * no database and no server to deploy — just a key.
 *
 * This module imports the Ably SDK, so it is only ever pulled in via the
 * lazily-loaded `AblyGameService` chunk — never in the demo bundle. The
 * SDK-free `isAblyConfigured` flag lives in `realtimeConfig.ts`.
 *
 * SECURITY: embedding a root API key in the browser is fine for an MVP/demo
 * (same trust model as a public key), but for production you should either
 * (a) create an Ably key whose capability is limited to publish/subscribe/
 * presence on `bk-room-*` channels, or (b) switch to token auth. See
 * ABLY_SETUP.md.
 */

import * as Ably from 'ably';
import { ablyApiKey } from './realtimeConfig';

/**
 * Create a fresh Ably Realtime connection bound to `clientId`. Returns null
 * if Ably isn't configured. `echoMessages: false` mirrors Supabase's
 * `broadcast.self = false` so a client never receives its own publishes.
 */
export function createAblyRealtime(clientId: string): Ably.Realtime | null {
  if (!ablyApiKey) return null;
  return new Ably.Realtime({
    key: ablyApiKey,
    clientId,
    echoMessages: false,
  });
}
