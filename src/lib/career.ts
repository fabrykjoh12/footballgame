/**
 * Career Mode — singleplayer league progression.
 *
 * You start in the bottom division and try to climb to the top flight, one
 * season at a time. A season is a 6-team single round-robin: you play your five
 * fixtures for real (each a normal local match vs the CPU), while the rival
 * AI-vs-AI results are simulated deterministically from the season seed. Finish
 * in the promotion places to go up; the bottom places go down. Win the top
 * division and you've conquered football.
 *
 * Everything here is pure + a thin localStorage wrapper (mirrors
 * `dailyChallenge` / `profileStats`), so the whole progression is unit-testable
 * and the React layer never owns game logic.
 */

import type { MatchMode, MatchSettings } from '../types/game';
import { mulberry32, hashString, type Rng } from './seededRandom';

const KEY = 'bk_career_v1';
const VERSION = 1;

export const TEAMS_PER_DIVISION = 6;
/** Single round-robin → you play every rival once. */
export const ROUNDS_PER_SEASON = TEAMS_PER_DIVISION - 1; // 5
export const PROMOTION_SPOTS = 2;
export const RELEGATION_SPOTS = 2;
export const YOU_ID = 'you';

/* ------------------------------------------------------------------ */
/* Divisions — difficulty rises as you climb the pyramid               */
/* ------------------------------------------------------------------ */

export interface Division {
  /** 1 = top flight, 4 = bottom. */
  tier: number;
  name: string;
  short: string;
  /** Match mode controls question difficulty + CPU sharpness. */
  mode: MatchMode;
  /** Per-question clock; tighter as you climb. */
  questionDurationMs: number;
}

export const DIVISIONS: Division[] = [
  { tier: 4, name: 'League Two', short: 'L2', mode: 'casual', questionDurationMs: 20000 },
  { tier: 3, name: 'League One', short: 'L1', mode: 'casual', questionDurationMs: 15000 },
  { tier: 2, name: 'Championship', short: 'Champ', mode: 'serious', questionDurationMs: 15000 },
  { tier: 1, name: 'Premier League', short: 'PL', mode: 'nightmare', questionDurationMs: 13000 },
];

export const TOP_TIER = 1;
export const BOTTOM_TIER = 4;

export function divisionByTier(tier: number): Division {
  return DIVISIONS.find((d) => d.tier === tier) ?? DIVISIONS[DIVISIONS.length - 1];
}

/** Average rival strength per tier — higher divisions field tougher rivals. */
function tierBaseStrength(tier: number): number {
  switch (tier) {
    case 4:
      return 0.34;
    case 3:
      return 0.46;
    case 2:
      return 0.58;
    default:
      return 0.72;
  }
}

/** Invented town names; rendered into clubs via `teamName()` like real players. */
const TOWN_POOL = [
  'Riverside', 'Northgate', 'Crownhill', 'Ashvale', 'Kingsbridge', 'Ironside',
  'Marlow', 'Eastfield', 'Highcross', 'Stormont', 'Brookmoor', 'Castleton',
  'Pinewood', 'Harborne', 'Westcliff', 'Foxdene', 'Oakmont', 'Silverbeck',
  'Thornwood', 'Claymoor', 'Redfern', 'Wildbrook', 'Granite', 'Hollowford',
];

/* ------------------------------------------------------------------ */
/* State model                                                         */
/* ------------------------------------------------------------------ */

export interface CareerTeam {
  id: string;
  /** Base name (a town); the club name is `teamName(name)`. */
  name: string;
  isYou: boolean;
  /** 0–1 rating used to simulate AI-vs-AI scorelines. */
  strength: number;
}

export interface MatchResult {
  homeId: string;
  awayId: string;
  homeGoals: number;
  awayGoals: number;
}

export interface Trophy {
  label: string;
  season: number;
  tier: number;
}

export type CareerStatus = 'in_season' | 'season_complete' | 'career_complete';

export interface SeasonOutcome {
  position: number;
  promoted: boolean;
  relegated: boolean;
  champion: boolean;
  /** Champion of the top flight — the whole point of the mode. */
  wonTitle: boolean;
  fromTier: number;
  toTier: number;
}

export interface CareerState {
  version: number;
  managerName: string;
  tier: number;
  season: number;
  seed: number;
  teams: CareerTeam[];
  /** schedule[round] = list of [homeId, awayId] pairings. */
  schedule: Array<Array<[string, string]>>;
  /** results[round] = the round's results (filled when the round is played). */
  results: MatchResult[][];
  /** Current round index (0-based); === ROUNDS_PER_SEASON when the season ends. */
  round: number;
  status: CareerStatus;
  trophies: Trophy[];
  /** Set when a season ends; cleared when the next season starts. */
  lastOutcome?: SeasonOutcome;
  /** Guards against double-recording the same finished match. */
  lastRecordedSig?: string;
}

/* ------------------------------------------------------------------ */
/* Schedule (round-robin, circle method)                               */
/* ------------------------------------------------------------------ */

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/** Seeded Fisher–Yates (does not mutate the input). */
export function seededShuffle<T>(items: T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Single round-robin schedule for an even number of team ids. Every team plays
 * every other exactly once across `n - 1` rounds, and never twice in a round.
 */
export function roundRobin(ids: string[]): Array<Array<[string, string]>> {
  const arr = [...ids];
  const n = arr.length;
  const rounds: Array<Array<[string, string]>> = [];
  for (let r = 0; r < n - 1; r++) {
    const pairs: Array<[string, string]> = [];
    for (let i = 0; i < n / 2; i++) {
      const home = arr[i];
      const away = arr[n - 1 - i];
      // Alternate home/away by round so it's not always the same side.
      pairs.push(r % 2 === 0 ? [home, away] : [away, home]);
    }
    rounds.push(pairs);
    // Rotate, fixing the first element.
    arr.splice(1, 0, arr.pop() as string);
  }
  return rounds;
}

/* ------------------------------------------------------------------ */
/* Season construction                                                 */
/* ------------------------------------------------------------------ */

function buildSeason(
  seed: number,
  tier: number,
  managerName: string,
): { teams: CareerTeam[]; schedule: Array<Array<[string, string]>> } {
  const rng = mulberry32(seed >>> 0);
  const base = tierBaseStrength(tier);

  const towns = seededShuffle(TOWN_POOL, rng).slice(0, TEAMS_PER_DIVISION - 1);
  const you: CareerTeam = {
    id: YOU_ID,
    name: managerName.trim() || 'You',
    isYou: true,
    strength: 0.5,
  };
  const rivals: CareerTeam[] = towns.map((town, i) => ({
    id: `ai-${i}`,
    name: town,
    isYou: false,
    strength: clamp(base + (rng() - 0.5) * 0.3, 0.1, 0.95),
  }));

  const teams = [you, ...rivals];
  // Shuffle the fixture order so seasons don't all start the same way.
  const order = seededShuffle(
    teams.map((t) => t.id),
    rng,
  );
  return { teams, schedule: roundRobin(order) };
}

function nextSeed(seed: number): number {
  return Math.floor(mulberry32((seed ^ 0x9e3779b1) >>> 0)() * 0xffffffff) >>> 0;
}

/**
 * Start a brand-new career in the bottom division. `seed` is stored so the
 * fixtures stay stable across reloads; pass one explicitly for deterministic
 * tests, otherwise the caller mixes in the wall clock for variety.
 */
export function createCareer(managerName: string, seed?: number): CareerState {
  const s = (seed ?? hashString(`${managerName}|${VERSION}`)) >>> 0;
  const { teams, schedule } = buildSeason(s, BOTTOM_TIER, managerName);
  return {
    version: VERSION,
    managerName: managerName.trim() || 'You',
    tier: BOTTOM_TIER,
    season: 1,
    seed: s,
    teams,
    schedule,
    results: [],
    round: 0,
    status: 'in_season',
    trophies: [],
  };
}

/* ------------------------------------------------------------------ */
/* Fixtures & standings                                                */
/* ------------------------------------------------------------------ */

export function teamById(state: CareerState, id: string): CareerTeam | undefined {
  return state.teams.find((t) => t.id === id);
}

export interface Fixture {
  opponent: CareerTeam;
  youHome: boolean;
}

/** Your fixture for the current round, or null if the season is over. */
export function currentFixture(state: CareerState): Fixture | null {
  if (state.round >= ROUNDS_PER_SEASON) return null;
  const pairs = state.schedule[state.round] ?? [];
  for (const [home, away] of pairs) {
    if (home === YOU_ID || away === YOU_ID) {
      const youHome = home === YOU_ID;
      const oppId = youHome ? away : home;
      const opponent = teamById(state, oppId);
      if (opponent) return { opponent, youHome };
    }
  }
  return null;
}

export interface StandingRow {
  team: CareerTeam;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
}

/** League table derived purely from the results played so far. */
export function computeStandings(state: CareerState): StandingRow[] {
  const rows = new Map<string, StandingRow>();
  for (const team of state.teams) {
    rows.set(team.id, {
      team,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDiff: 0,
      points: 0,
    });
  }

  for (const round of state.results) {
    for (const m of round) {
      const home = rows.get(m.homeId);
      const away = rows.get(m.awayId);
      if (!home || !away) continue;
      home.played++;
      away.played++;
      home.goalsFor += m.homeGoals;
      home.goalsAgainst += m.awayGoals;
      away.goalsFor += m.awayGoals;
      away.goalsAgainst += m.homeGoals;
      if (m.homeGoals > m.awayGoals) {
        home.won++;
        home.points += 3;
        away.lost++;
      } else if (m.homeGoals < m.awayGoals) {
        away.won++;
        away.points += 3;
        home.lost++;
      } else {
        home.drawn++;
        away.drawn++;
        home.points++;
        away.points++;
      }
    }
  }

  const list = [...rows.values()];
  for (const r of list) r.goalDiff = r.goalsFor - r.goalsAgainst;
  list.sort(
    (a, b) =>
      b.points - a.points ||
      b.goalDiff - a.goalDiff ||
      b.goalsFor - a.goalsFor ||
      a.team.name.localeCompare(b.team.name),
  );
  return list;
}

export function yourPosition(state: CareerState): number {
  const table = computeStandings(state);
  return table.findIndex((r) => r.team.isYou) + 1;
}

/* ------------------------------------------------------------------ */
/* Simulation + recording                                              */
/* ------------------------------------------------------------------ */

function sampleGoals(attack: number, defence: number, rng: Rng): number {
  const expected = clamp(1.4 + (attack - defence) * 2.2, 0.25, 4.2);
  const p = clamp(expected / 5, 0, 0.95);
  let goals = 0;
  for (let i = 0; i < 5; i++) if (rng() < p) goals++;
  return goals;
}

/** Deterministic AI-vs-AI result for a fixture in a given round. */
function simResult(home: CareerTeam, away: CareerTeam, rng: Rng): MatchResult {
  return {
    homeId: home.id,
    awayId: away.id,
    homeGoals: sampleGoals(home.strength, away.strength, rng),
    awayGoals: sampleGoals(away.strength, home.strength, rng),
  };
}

function evaluateOutcome(state: CareerState): SeasonOutcome {
  const table = computeStandings(state);
  const position = table.findIndex((r) => r.team.isYou) + 1;
  const promoted = position <= PROMOTION_SPOTS && state.tier > TOP_TIER;
  const relegated =
    position > TEAMS_PER_DIVISION - RELEGATION_SPOTS && state.tier < BOTTOM_TIER;
  const champion = position === 1;
  const wonTitle = champion && state.tier === TOP_TIER;
  let toTier = state.tier;
  if (promoted) toTier = Math.max(TOP_TIER, state.tier - 1);
  else if (relegated) toTier = Math.min(BOTTOM_TIER, state.tier + 1);
  return { position, promoted, relegated, champion, wonTitle, fromTier: state.tier, toTier };
}

function trophiesFor(state: CareerState, outcome: SeasonOutcome): Trophy[] {
  const div = divisionByTier(state.tier);
  const earned: Trophy[] = [];
  if (outcome.champion) {
    earned.push({
      label: `${div.name} Champions`,
      season: state.season,
      tier: state.tier,
    });
  }
  if (outcome.promoted && !outcome.champion) {
    earned.push({
      label: `Promoted from ${div.name}`,
      season: state.season,
      tier: state.tier,
    });
  }
  return earned;
}

/**
 * Record your finished fixture and simulate the rest of the round, advancing the
 * season. Idempotent per match `sig` so React StrictMode double-effects and
 * re-renders don't double-count.
 */
export function recordYourMatch(
  state: CareerState,
  result: { yourGoals: number; oppGoals: number; sig: string },
): CareerState {
  if (state.lastRecordedSig === result.sig) return state;
  if (state.round >= ROUNDS_PER_SEASON) return state;

  const fixture = currentFixture(state);
  if (!fixture) return state;

  const rng = mulberry32((state.seed ^ Math.imul(state.round + 1, 0x9e3779b1)) >>> 0);
  const pairs = state.schedule[state.round] ?? [];
  const roundResults: MatchResult[] = [];

  for (const [homeId, awayId] of pairs) {
    if (homeId === YOU_ID || awayId === YOU_ID) {
      const youHome = homeId === YOU_ID;
      roundResults.push({
        homeId,
        awayId,
        homeGoals: youHome ? result.yourGoals : result.oppGoals,
        awayGoals: youHome ? result.oppGoals : result.yourGoals,
      });
    } else {
      const home = teamById(state, homeId);
      const away = teamById(state, awayId);
      if (home && away) roundResults.push(simResult(home, away, rng));
    }
  }

  const results = [...state.results, roundResults];
  const round = state.round + 1;
  const next: CareerState = {
    ...state,
    results,
    round,
    lastRecordedSig: result.sig,
  };

  if (round >= ROUNDS_PER_SEASON) {
    const outcome = evaluateOutcome(next);
    next.lastOutcome = outcome;
    next.status = outcome.wonTitle ? 'career_complete' : 'season_complete';
    next.trophies = [...next.trophies, ...trophiesFor(next, outcome)];
  }

  return next;
}

/** Begin the next season, applying promotion / relegation from the last one. */
export function startNextSeason(state: CareerState): CareerState {
  const outcome = state.lastOutcome ?? evaluateOutcome(state);
  const tier = outcome.toTier;
  const season = state.season + 1;
  const seed = nextSeed(state.seed);
  const { teams, schedule } = buildSeason(seed, tier, state.managerName);
  return {
    ...state,
    tier,
    season,
    seed,
    teams,
    schedule,
    results: [],
    round: 0,
    status: 'in_season',
    lastOutcome: undefined,
    lastRecordedSig: undefined,
  };
}

/* ------------------------------------------------------------------ */
/* Match settings for a fixture                                        */
/* ------------------------------------------------------------------ */

export function careerMatchSettings(state: CareerState): Partial<MatchSettings> {
  const div = divisionByTier(state.tier);
  return {
    mode: div.mode,
    questionCount: 10,
    questionDurationMs: div.questionDurationMs,
    careerMatch: true,
  };
}

/* ------------------------------------------------------------------ */
/* Storage                                                             */
/* ------------------------------------------------------------------ */

export function getCareer(): CareerState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CareerState;
    if (parsed.version !== VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveCareer(state: CareerState): CareerState {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable */
  }
  return state;
}

export function clearCareer(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable */
  }
}
