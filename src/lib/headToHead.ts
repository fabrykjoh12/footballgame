/**
 * Head-to-head records — a local tally of wins/draws/losses (and goals) against
 * each opponent you've faced, keyed by their display name. Most useful for
 * multiplayer rivalries ("you lead Jonas 4–2"), but career and demo opponents
 * are tracked too. Purely local; idempotent per finished match.
 */

import type { Room } from '../types/game';

const KEY = 'bk_h2h_v1';

export interface HeadToHeadRecord {
  /** Opponent's display name (as last seen). */
  name: string;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  /** Total meetings. */
  played: number;
  /** Guards against double-counting the same finished match. */
  lastSig?: string;
}

export type HeadToHeadStore = Record<string, HeadToHeadRecord>;

/** Normalise a name into a stable key (case/space-insensitive). */
export function h2hKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function getHeadToHead(): HeadToHeadStore {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as HeadToHeadStore) : {};
  } catch {
    return {};
  }
}

function save(store: HeadToHeadStore): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    /* storage unavailable / full */
  }
}

/** The record against a given opponent name, if any. */
export function getOpponentRecord(name: string): HeadToHeadRecord | undefined {
  return getHeadToHead()[h2hKey(name)];
}

export function resetHeadToHead(): HeadToHeadStore {
  save({});
  return {};
}

function matchSignature(room: Room): string {
  return `${room.createdAt}:${room.selectedQuestions.map((q) => q.id).join(',')}`;
}

/** Record a finished match against the local player's opponent. Idempotent. */
export function recordHeadToHead(room: Room, localPlayerId: string): HeadToHeadStore {
  const store = getHeadToHead();
  const me = room.players.find((p) => p.id === localPlayerId);
  const opp = room.players.find((p) => p.id !== localPlayerId);
  if (!me || !opp || !opp.name.trim()) return store;

  const key = h2hKey(opp.name);
  const sig = matchSignature(room);
  const prev: HeadToHeadRecord = store[key] ?? {
    name: opp.name,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    played: 0,
  };
  if (prev.lastSig === sig) return store; // already counted

  let outcome: 'win' | 'loss' | 'draw' = 'draw';
  if (me.goals !== opp.goals) outcome = me.goals > opp.goals ? 'win' : 'loss';
  else if (me.score !== opp.score) outcome = me.score > opp.score ? 'win' : 'loss';

  store[key] = {
    name: opp.name, // refresh to the latest spelling
    wins: prev.wins + (outcome === 'win' ? 1 : 0),
    draws: prev.draws + (outcome === 'draw' ? 1 : 0),
    losses: prev.losses + (outcome === 'loss' ? 1 : 0),
    goalsFor: prev.goalsFor + me.goals,
    goalsAgainst: prev.goalsAgainst + opp.goals,
    played: prev.played + 1,
    lastSig: sig,
  };
  save(store);
  return store;
}

/** A short "W–D–L" summary for display. */
export function h2hSummary(rec: HeadToHeadRecord): string {
  return `${rec.wins}W ${rec.draws}D ${rec.losses}L`;
}
