/**
 * Cup Runs — themed singleplayer knockout tournaments.
 *
 * A Cup is a sequence of one-off ties against escalating CPU opponents: win to
 * advance, lose (or fail to win the tie) and you're out; win the final and you
 * lift the trophy. Each tie is just a normal local match flagged
 * `settings.cupMatch` — exactly the Career Mode pattern — so there are NO match
 * engine changes. The bracket transitions are pure (and unit-tested); the active
 * run + earned trophies persist in localStorage.
 */

import type { MatchMode, MatchSettings, Room } from '../types/game';

export interface CupRound {
  /** Display name, e.g. "Quarter-final". */
  name: string;
  /** CPU opponent for this tie. */
  opponent: string;
  mode: MatchMode;
  /** Per-question clock (tightens in later rounds). */
  questionDurationMs: number;
}

export interface CupDef {
  id: string;
  name: string;
  /** Emoji marker (house rule: no crests / photos). */
  emoji: string;
  blurb: string;
  rounds: CupRound[];
}

/** The three themed cups, escalating in difficulty round by round. */
export const CUPS: CupDef[] = [
  {
    id: 'champions-run',
    name: 'Champions Run',
    emoji: '🏆',
    blurb: 'Four knockout ties against Europe’s best. Win the final to be crowned champions.',
    rounds: [
      { name: 'Round of 16', opponent: 'Ajax', mode: 'casual', questionDurationMs: 15000 },
      { name: 'Quarter-final', opponent: 'Napoli', mode: 'serious', questionDurationMs: 14000 },
      { name: 'Semi-final', opponent: 'Borussia Dortmund', mode: 'serious', questionDurationMs: 13000 },
      { name: 'Final', opponent: 'Real Madrid', mode: 'nightmare', questionDurationMs: 12000 },
    ],
  },
  {
    id: 'world-cup-dream',
    name: 'World Cup Dream',
    emoji: '🌍',
    blurb: 'Knock out the giants of the international game and go all the way to the final.',
    rounds: [
      { name: 'Round of 16', opponent: 'Japan', mode: 'casual', questionDurationMs: 15000 },
      { name: 'Quarter-final', opponent: 'Netherlands', mode: 'serious', questionDurationMs: 14000 },
      { name: 'Semi-final', opponent: 'Germany', mode: 'serious', questionDurationMs: 13000 },
      { name: 'Final', opponent: 'Brazil', mode: 'nightmare', questionDurationMs: 11000 },
    ],
  },
  {
    id: 'cup-sprint',
    name: 'Cup Sprint',
    emoji: '⚡',
    blurb: 'A quick three-tie run for a fast trophy — the clock is tight from the start.',
    rounds: [
      { name: 'Quarter-final', opponent: 'Sevilla', mode: 'serious', questionDurationMs: 13000 },
      { name: 'Semi-final', opponent: 'Atlético Madrid', mode: 'serious', questionDurationMs: 12000 },
      { name: 'Final', opponent: 'Barcelona', mode: 'nightmare', questionDurationMs: 11000 },
    ],
  },
];

export function getCup(id: string): CupDef | undefined {
  return CUPS.find((c) => c.id === id);
}

/* ------------------------------------------------------------------ */
/* Bracket state (pure)                                                */
/* ------------------------------------------------------------------ */

export type CupStatus = 'playing' | 'won' | 'out';

export interface CupRun {
  cupId: string;
  /** Index of the round currently being / about to be played. */
  round: number;
  status: CupStatus;
  /** Guards against double-counting the same finished tie. */
  lastSig?: string;
}

export function startCupRun(cupId: string): CupRun {
  return { cupId, round: 0, status: 'playing' };
}

/** The round currently in play, or null when the run is over. */
export function currentRound(run: CupRun, def: CupDef): CupRound | null {
  if (run.status !== 'playing') return null;
  return def.rounds[run.round] ?? null;
}

export function isFinalRound(run: CupRun, def: CupDef): boolean {
  return run.round === def.rounds.length - 1;
}

/**
 * Apply a finished tie. A loss (or a non-win) knocks you out; a win advances to
 * the next round, or wins the cup if it was the final. Pure.
 */
export function advanceCupRun(run: CupRun, def: CupDef, won: boolean): CupRun {
  if (run.status !== 'playing') return run;
  if (!won) return { ...run, status: 'out' };
  if (isFinalRound(run, def)) return { ...run, status: 'won' };
  return { ...run, round: run.round + 1 };
}

/** Match settings for a cup tie (a standard 10-question match, flagged). */
export function roundSettings(round: CupRound): Partial<MatchSettings> {
  return {
    mode: round.mode,
    questionCount: 10,
    questionDurationMs: round.questionDurationMs,
    cupMatch: true,
  };
}

/** Whether the local player won a finished tie (goals, then points). */
export function didWinTie(room: Room, localPlayerId: string): boolean {
  const me = room.players.find((p) => p.id === localPlayerId);
  const opp = room.players.find((p) => p.id !== localPlayerId);
  if (!me || !opp) return false;
  if (me.goals !== opp.goals) return me.goals > opp.goals;
  return me.score > opp.score; // a dead-level tie counts as elimination
}

/* ------------------------------------------------------------------ */
/* Persistence                                                         */
/* ------------------------------------------------------------------ */

const KEY = 'bk_cup_v1';

export interface CupSave {
  active: CupRun | null;
  /** Cup ids the player has won. */
  trophies: string[];
}

const EMPTY: CupSave = { active: null, trophies: [] };

export function getCupSave(): CupSave {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...EMPTY, ...(JSON.parse(raw) as CupSave) } : { ...EMPTY };
  } catch {
    return { ...EMPTY };
  }
}

function save(s: CupSave): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage unavailable */
  }
}

/** Begin (or restart) a cup run and persist it as the active run. */
export function beginCup(cupId: string): CupSave {
  const prev = getCupSave();
  const next: CupSave = { ...prev, active: startCupRun(cupId) };
  save(next);
  return next;
}

/**
 * Record a finished tie: advance the active run, award the trophy on a final
 * win. Idempotent per match via `sig`. Returns the updated save.
 */
export function recordCupResult(won: boolean, sig: string): CupSave {
  const prev = getCupSave();
  const run = prev.active;
  if (!run || run.status !== 'playing') return prev;
  if (run.lastSig === sig) return prev; // already recorded this tie

  const def = getCup(run.cupId);
  if (!def) return prev;

  const advanced = advanceCupRun(run, def, won);
  advanced.lastSig = sig;
  const trophies =
    advanced.status === 'won' && !prev.trophies.includes(run.cupId)
      ? [...prev.trophies, run.cupId]
      : prev.trophies;

  const next: CupSave = { active: advanced, trophies };
  save(next);
  return next;
}

/** Clear the active run (e.g. when the player leaves the result screen). */
export function clearActiveCup(): CupSave {
  const prev = getCupSave();
  const next: CupSave = { ...prev, active: null };
  save(next);
  return next;
}

/** A stable signature for a finished match (mirrors profileStats). */
export function cupMatchSignature(room: Room): string {
  return `${room.createdAt}:${room.selectedQuestions.map((q) => q.id).join(',')}`;
}
