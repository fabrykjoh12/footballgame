/**
 * Rondo — online sync layer (pure).
 *
 * Wraps the pure `engine` for host-authoritative 1v1, mirroring the Scout /
 * Mystery online design — but Rondo has **no secrets**, so nothing is redacted:
 * the shared category is public and the HOST simply holds the authoritative
 * `RondoSyncState`, applies every action (its own + the guest's), and broadcasts
 * the whole snapshot on change. The host maps host→'A', guest→'B'.
 *
 * The one Rondo-specific wrinkle is the **turn clock**. Online, the clock must
 * be authoritative, so the host stamps a `turnDeadline` (host wall-clock ms)
 * whenever the active turn changes; a `timeout` action is only honoured once
 * that deadline has actually passed (anti-grief). All wall-clock time enters
 * through the `now` parameter, so this module stays pure and unit-testable — the
 * Ably service (`ablyRondoService`) supplies `Date.now()` and is a thin transport.
 */

import { hashString } from '../seededRandom';
import { PLAYERS } from '../../data/players';
import type { Player } from '../playerDb';
import { rondoCatalog } from './daily';
import {
  startRondoMatch,
  startRondoRally,
  nameInRondo,
  timeoutRondo,
  concludeRally,
  nextRondoRally,
  otherRondoSide,
  type RondoMatch,
  type RondoSide,
} from './engine';
import { scoutCategoryById, type ScoutCategory } from '../scout/categories';

export const RONDO_ONLINE_TARGET = 3;
export const RONDO_TURN_MS = 15000;

export interface RondoOnlinePlayer {
  id: string;
  name: string;
  side: RondoSide;
}

export interface RondoSyncState {
  players: RondoOnlinePlayer[];
  /** Category-selection seed (derived from the room code — shared by both). */
  seed: number;
  /** Increments per rally; drives the deterministic category pick. */
  rallyIndex: number;
  /** The match; null until the guest joins and the host starts it. */
  match: RondoMatch | null;
  /** Who serves first each match (alternates on rematch). */
  firstServe: RondoSide;
  /** Host wall-clock ms when the current turn expires (null when no live rally). */
  turnDeadline: number | null;
}

export type RondoOnlineAction =
  | { kind: 'name'; playerId: string; targetId: string }
  | { kind: 'timeout'; playerId: string }
  | { kind: 'rematch'; playerId: string };

/** Deterministic, shared category for a rally index (same for host + guest). */
export function pickRondoCategoryId(seed: number, index: number): { id: string; label: string } {
  const cat = rondoCatalog();
  const c = cat[(seed + hashString(`r${index}`)) % cat.length];
  return { id: c.id, label: c.label };
}

export function initRondoSync(host: { id: string; name: string }, seed: number): RondoSyncState {
  return {
    players: [{ id: host.id, name: host.name, side: 'A' }],
    seed,
    rallyIndex: 0,
    match: null,
    firstServe: 'A',
    turnDeadline: null,
  };
}

export function sideOf(state: RondoSyncState, playerId: string): RondoSide | null {
  return state.players.find((p) => p.id === playerId)?.side ?? null;
}

export function bothPresent(state: RondoSyncState): boolean {
  return state.players.length >= 2;
}

/** Start (or restart) a match in the state at `now`. */
function beginMatch(state: RondoSyncState, now: number): RondoSyncState {
  const idx = state.rallyIndex + 1;
  const cat = pickRondoCategoryId(state.seed, idx);
  const match = startRondoMatch(
    RONDO_ONLINE_TARGET,
    startRondoRally(cat.id, cat.label, state.firstServe),
  );
  return { ...state, rallyIndex: idx, match, turnDeadline: now + RONDO_TURN_MS };
}

/** After a rally ends: advance to the next rally, or leave the match over. */
function afterRally(state: RondoSyncState, concluded: RondoMatch, now: number): RondoSyncState {
  if (concluded.phase === 'over') return { ...state, match: concluded, turnDeadline: null };
  const idx = state.rallyIndex + 1;
  const cat = pickRondoCategoryId(state.seed, idx);
  return {
    ...state,
    rallyIndex: idx,
    match: nextRondoRally(concluded, cat.id, cat.label),
    turnDeadline: now + RONDO_TURN_MS,
  };
}

/** Seat a guest as side B and auto-start the match (idempotent). */
export function addRondoGuest(
  state: RondoSyncState,
  guest: { id: string; name: string },
  now: number,
): RondoSyncState {
  if (state.players.some((p) => p.id === guest.id) || state.players.length >= 2) return state;
  const seated: RondoSyncState = {
    ...state,
    players: [...state.players, { id: guest.id, name: guest.name, side: 'B' }],
  };
  return beginMatch(seated, now);
}

/**
 * Apply one action to the host's authoritative state. Returns the SAME
 * reference on a no-op / illegal action (so callers can skip a broadcast).
 */
export function applyRondoAction(
  state: RondoSyncState,
  action: RondoOnlineAction,
  now: number,
  catalog?: ScoutCategory[],
  players: Player[] = PLAYERS,
): RondoSyncState {
  const side = sideOf(state, action.playerId);
  if (!side) return state;
  const match = state.match;

  try {
    switch (action.kind) {
      case 'name': {
        if (!match || match.phase === 'over' || match.rally.phase !== 'playing') return state;
        if (match.rally.turn !== side) return state; // not your turn
        const cat = scoutCategoryById(match.rally.categoryId, catalog);
        if (!cat) return state;
        const target = players.find((p) => p.id === action.targetId);
        if (!target) return state;
        const { rally, result } = nameInRondo(match.rally, side, target, cat);
        if (result === 'ok') {
          return { ...state, match: { ...match, rally }, turnDeadline: now + RONDO_TURN_MS };
        }
        return afterRally(state, concludeRally(match, rally), now);
      }
      case 'timeout': {
        if (!match || match.phase === 'over' || match.rally.phase !== 'playing') return state;
        // Only honour a timeout once the deadline has genuinely passed.
        if (state.turnDeadline != null && now < state.turnDeadline) return state;
        return afterRally(state, concludeRally(match, timeoutRondo(match.rally)), now);
      }
      case 'rematch': {
        if (!match || match.phase !== 'over') return state;
        return beginMatch({ ...state, firstServe: otherRondoSide(state.firstServe) }, now);
      }
    }
  } catch {
    return state; // illegal engine move — ignore rather than crash the host
  }
}
