/**
 * The Scout — online sync layer (pure).
 *
 * Wraps the pure duel `engine` for host-authoritative 1v1, mirroring the
 * Mystery online design: the HOST holds the authoritative `ScoutSyncState`,
 * applies every action, and broadcasts a *redacted* snapshot; each client
 * re-injects only its OWN secret rule. The host maps the two players to sides
 * (host = 'A', guest = 'B'); illegal engine moves (wrong turn, etc.) are
 * swallowed so a spoofed or racey action can never crash the round.
 *
 * All logic here is pure over immutable state, so it's unit-testable and the
 * Ably service (`ablyScoutService`) stays a thin transport.
 */

import { PLAYERS } from '../../data/players';
import type { Player } from '../playerDb';
import {
  startScoutRound,
  probeRule,
  accuseRule,
  otherSide,
  type ScoutRound,
  type ScoutSide,
} from './engine';
import { scoutCatalog, type ScoutCategory } from './categories';

export interface ScoutOnlinePlayer {
  id: string;
  name: string;
  side: ScoutSide;
}

export interface ScoutSyncState {
  players: ScoutOnlinePlayer[];
  /** Secret rule per side (null until picked; redacted on the wire). */
  secrets: Record<ScoutSide, string | null>;
  locked: Record<ScoutSide, boolean>;
  /** The duel round; null until both sides have locked a secret. */
  round: ScoutRound | null;
  /** Who acts first when the round starts (alternates on rematch). */
  firstTurn: ScoutSide;
}

export type ScoutOnlineAction =
  | { kind: 'lock'; playerId: string; categoryId: string }
  | { kind: 'probe'; playerId: string; targetId: string }
  | { kind: 'accuse'; playerId: string; categoryId: string }
  | { kind: 'rematch'; playerId: string };

/** Fresh host-side state with only the host present (guest joins later). */
export function initScoutSync(host: { id: string; name: string }): ScoutSyncState {
  return {
    players: [{ id: host.id, name: host.name, side: 'A' }],
    secrets: { A: null, B: null },
    locked: { A: false, B: false },
    round: null,
    firstTurn: 'A',
  };
}

/** Seat a guest as side B (idempotent). */
export function addScoutGuest(state: ScoutSyncState, guest: { id: string; name: string }): ScoutSyncState {
  if (state.players.some((p) => p.id === guest.id) || state.players.length >= 2) return state;
  return { ...state, players: [...state.players, { id: guest.id, name: guest.name, side: 'B' }] };
}

export function sideOf(state: ScoutSyncState, playerId: string): ScoutSide | null {
  return state.players.find((p) => p.id === playerId)?.side ?? null;
}

export function bothLocked(state: ScoutSyncState): boolean {
  return state.locked.A && state.locked.B;
}

export function isRevealed(state: ScoutSyncState): boolean {
  return state.round?.phase === 'over';
}

/**
 * Apply one action to the host's authoritative state. Returns the SAME
 * reference when the action is a no-op or illegal (so callers can skip a
 * broadcast). Engine throws (wrong turn, out of probes, dup) are swallowed.
 */
export function applyScoutAction(
  state: ScoutSyncState,
  action: ScoutOnlineAction,
  catalog: ScoutCategory[] = scoutCatalog(),
  players: Player[] = PLAYERS,
): ScoutSyncState {
  const side = sideOf(state, action.playerId);
  if (!side) return state;

  try {
    switch (action.kind) {
      case 'lock': {
        if (state.locked[side]) return state;
        const secrets = { ...state.secrets, [side]: action.categoryId };
        const locked = { ...state.locked, [side]: true };
        let round = state.round;
        if (locked.A && locked.B && secrets.A && secrets.B && !round) {
          round = startScoutRound(secrets.A, secrets.B, state.firstTurn);
        }
        return { ...state, secrets, locked, round };
      }
      case 'probe': {
        if (!state.round) return state;
        const player = players.find((p) => p.id === action.targetId);
        if (!player) return state;
        const round = probeRule(state.round, side, player, catalog);
        return { ...state, round };
      }
      case 'accuse': {
        if (!state.round) return state;
        const round = accuseRule(state.round, side, action.categoryId, catalog);
        return { ...state, round };
      }
      case 'rematch': {
        if (!isRevealed(state)) return state;
        return {
          ...state,
          secrets: { A: null, B: null },
          locked: { A: false, B: false },
          round: null,
          firstTurn: otherSide(state.firstTurn),
        };
      }
    }
  } catch {
    return state; // illegal engine move — ignore rather than crash the host
  }
}

/** Blank every secret for the broadcast snapshot (until the round is decided). */
export function redactScoutState(state: ScoutSyncState): ScoutSyncState {
  if (isRevealed(state)) return state;
  const secrets: Record<ScoutSide, string | null> = {
    A: state.secrets.A != null ? '' : null,
    B: state.secrets.B != null ? '' : null,
  };
  const round = state.round ? { ...state.round, secrets: { A: '', B: '' } } : null;
  return { ...state, secrets, round };
}

/** Re-inject this device's own secret into a (redacted) snapshot for rendering. */
export function localScoutView(
  state: ScoutSyncState,
  mySide: ScoutSide,
  mySecret: string | null,
): ScoutSyncState {
  if (mySecret == null || isRevealed(state)) return state;
  const secrets = { ...state.secrets, [mySide]: mySecret };
  const round = state.round
    ? { ...state.round, secrets: { ...state.round.secrets, [mySide]: mySecret } }
    : null;
  return { ...state, secrets, round };
}
