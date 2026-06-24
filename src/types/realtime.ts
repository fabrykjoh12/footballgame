/**
 * Wire protocol shared by every transport (CPU, Ably, Supabase).
 *
 * These are the ONLY shapes that cross the transport boundary. Inbound data is
 * `unknown` until validated against these unions (see lib/validate.ts), so a
 * malformed payload becomes a soft error instead of a crash.
 */

import type { AnswerOutcome, AnswerValue, OpponentInfo } from './match.ts';

/** Bump when the wire format changes incompatibly. */
export const PROTOCOL_VERSION = 1;

/** Events the local player emits toward the opponent/transport. */
export type PlayerEvent =
  | { t: 'ready'; matchId: string }
  | { t: 'question_open'; questionIndex: number; deadline: number }
  | {
      t: 'answer';
      questionIndex: number;
      answer: AnswerValue;
      elapsedMs: number;
    }
  | { t: 'rematch_request' }
  | { t: 'leave' };

/** Events the transport delivers about the opponent. */
export type OpponentEvent =
  | { t: 'opponent_found'; opponent: OpponentInfo }
  | { t: 'opponent_ready' }
  | { t: 'opponent_answer'; questionIndex: number; outcome: AnswerOutcome }
  | { t: 'opponent_left' }
  | { t: 'rematch_offered' };

/** Handshake exchanged on channel join so versions can diverge safely. */
export interface ProtocolHandshake {
  v: number;
  matchId: string;
}

export type PlayerEventTag = PlayerEvent['t'];
export type OpponentEventTag = OpponentEvent['t'];
