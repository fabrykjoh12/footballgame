/**
 * Transport factory — selects the concrete transport at runtime.
 *
 * CPU is always available. Online transports (Ably/Supabase) are wired in a
 * later phase and are gated behind env keys; until then, requesting online
 * without keys throws ONLINE_UNAVAILABLE, which the menu prevents by hiding the
 * option when `onlineAvailable(env)` is false.
 */

import {
  MatchError,
  type Difficulty,
  type GameMode,
  type OpponentInfo,
} from '../types/match.ts';
import { LocalCpuTransport } from '../engine/cpu/LocalCpuTransport.ts';
import {
  onlineAvailable,
  type MatchTransport,
  type RuntimeEnv,
} from './MatchTransport.ts';

export interface TransportRequest {
  mode: GameMode;
  env: RuntimeEnv;
  seed: number;
  /** Required for CPU mode. */
  cpuOpponent?: OpponentInfo;
  cpuDifficulty?: Difficulty;
}

export function createTransport(req: TransportRequest): MatchTransport {
  if (req.mode === 'cpu') {
    if (!req.cpuOpponent || !req.cpuDifficulty) {
      throw new MatchError('ILLEGAL_TRANSITION', 'CPU transport needs an opponent + difficulty');
    }
    return new LocalCpuTransport({
      opponent: req.cpuOpponent,
      difficulty: req.cpuDifficulty,
      seed: req.seed,
    });
  }

  // mode === 'online'
  if (!onlineAvailable(req.env)) {
    throw new MatchError('ONLINE_UNAVAILABLE');
  }
  // Online transports land in a future phase; fail loudly until then.
  throw new MatchError(
    'ONLINE_UNAVAILABLE',
    'Online transport not yet implemented',
  );
}
