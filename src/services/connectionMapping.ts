import type { ConnectionState } from '../types/game';

/**
 * Map a realtime SDK connection state to the UI's coarse `ConnectionState`.
 * Returns `null` for states the UI should ignore (initialized / closing /
 * closed) so intentional teardown never flashes a "reconnecting" banner.
 */
export function mapRealtimeState(state: string): ConnectionState | null {
  switch (state) {
    case 'connected':
      return 'connected';
    case 'connecting':
    case 'disconnected':
    case 'suspended':
      return 'reconnecting';
    case 'failed':
      return 'failed';
    default:
      return null; // initialized / closing / closed
  }
}
