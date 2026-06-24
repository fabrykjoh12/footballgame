/**
 * Runtime validation at the transport boundary.
 *
 * Inbound real-time messages are `unknown` until proven to match our wire
 * types. The single audited cast in the codebase lives here — everywhere else
 * works with fully typed values. Hand-rolled guards keep the bundle tiny.
 */

import type { AnswerOutcome, OpponentInfo, TeamIdentity } from '../types/match.ts';
import type { OpponentEvent } from '../types/realtime.ts';

type Rec = Record<string, unknown>;

const isRec = (v: unknown): v is Rec =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const isStr = (v: unknown): v is string => typeof v === 'string';
const isNum = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v);
const isBool = (v: unknown): v is boolean => typeof v === 'boolean';

function isTeam(v: unknown): v is TeamIdentity {
  return (
    isRec(v) && isStr(v.name) && isStr(v.primaryRgb) && isStr(v.secondaryRgb)
  );
}

function isOpponentInfo(v: unknown): v is OpponentInfo {
  return isRec(v) && isStr(v.id) && isStr(v.displayName) && isTeam(v.team);
}

function isOutcome(v: unknown): v is AnswerOutcome {
  return (
    isRec(v) && isBool(v.correct) && isNum(v.quality) && isNum(v.elapsedMs)
  );
}

/**
 * Parse an unknown inbound message into an OpponentEvent, or return null if it
 * does not conform. Returning null (never throwing) lets the engine degrade
 * gracefully on garbage input.
 */
export function parseOpponentEvent(raw: unknown): OpponentEvent | null {
  if (!isRec(raw) || !isStr(raw.t)) return null;

  switch (raw.t) {
    case 'opponent_found':
      return isOpponentInfo(raw.opponent)
        ? { t: 'opponent_found', opponent: raw.opponent }
        : null;
    case 'opponent_ready':
      return { t: 'opponent_ready' };
    case 'opponent_answer':
      return isNum(raw.questionIndex) && isOutcome(raw.outcome)
        ? {
            t: 'opponent_answer',
            questionIndex: raw.questionIndex,
            outcome: raw.outcome,
          }
        : null;
    case 'opponent_left':
      return { t: 'opponent_left' };
    case 'rematch_offered':
      return { t: 'rematch_offered' };
    default:
      return null;
  }
}
