/**
 * Career Mode — progression flavour & board layer (pure, derived).
 *
 * Everything here is derived on the fly from an existing `CareerState`, so it
 * adds depth (rival personalities, a season rival, board objectives, board
 * confidence, manager reputation) WITHOUT changing the stored schema — old
 * saves keep loading. No staff/coaches: this is club + board + rivalry only.
 */

import type { Category } from '../types/game';
import { hashString } from './seededRandom';
import {
  computeStandings,
  divisionByTier,
  yourPosition,
  teamById,
  PROMOTION_SPOTS,
  RELEGATION_SPOTS,
  TEAMS_PER_DIVISION,
  ROUNDS_PER_SEASON,
  TOP_TIER,
  BOTTOM_TIER,
  YOU_ID,
  type CareerState,
  type CareerTeam,
} from './career';

/* ------------------------------------------------------------------ */
/* Rival club personalities (flavour, derived deterministically)       */
/* ------------------------------------------------------------------ */

export interface RivalProfile {
  strongestCategory: Category;
  weakestCategory: Category;
  playStyle: string;
  personality: string;
}

const CATEGORIES: Category[] = [
  'players', 'clubs', 'countries', 'leagues',
  'champions_league', 'world_cup', 'transfers', 'history',
];

const CATEGORY_LABEL: Record<Category, string> = {
  players: 'players',
  clubs: 'clubs',
  countries: 'countries',
  leagues: 'leagues',
  champions_league: 'European nights',
  world_cup: 'World Cups',
  transfers: 'the transfer market',
  history: 'history',
};

const PLAY_STYLES = [
  'Counter-attacking',
  'High press',
  'Possession-based',
  'Direct & physical',
  'Patient build-up',
  'Route one',
  'Gegenpress',
  'Park the bus',
];

const PERSONA_TEMPLATES = [
  'Ruthless on {strong}, but rattled on {weak}.',
  'Tough to break down — lethal on {strong}.',
  'Comeback specialists who live for {strong}.',
  'Slow starters; punish them early on {weak}.',
  'Streaky form, dangerous when {strong} comes up.',
  'Bottlers under pressure — exploit {weak}.',
];

function pickFrom<T>(arr: T[], h: number): T {
  return arr[h % arr.length];
}

/** Deterministic personality for a rival club (stable per team + season seed). */
export function rivalProfile(team: CareerTeam, seed: number): RivalProfile {
  const base = hashString(`${team.id}|${seed}`);
  const strongestCategory = pickFrom(CATEGORIES, base);
  let weakestCategory = pickFrom(CATEGORIES, base >> 3);
  if (weakestCategory === strongestCategory) {
    weakestCategory = CATEGORIES[(CATEGORIES.indexOf(strongestCategory) + 1) % CATEGORIES.length];
  }
  const playStyle = pickFrom(PLAY_STYLES, base >> 6);
  const personality = pickFrom(PERSONA_TEMPLATES, base >> 9)
    .replace('{strong}', CATEGORY_LABEL[strongestCategory])
    .replace('{weak}', CATEGORY_LABEL[weakestCategory]);
  return { strongestCategory, weakestCategory, playStyle, personality };
}

/**
 * Your designated rival for the season: the AI club closest in strength to you
 * (the natural title/promotion rival). Deterministic; null if no rivals.
 */
export function seasonRival(state: CareerState): CareerTeam | null {
  const rivals = state.teams.filter((t) => !t.isYou);
  if (rivals.length === 0) return null;
  const you = state.teams.find((t) => t.isYou);
  const target = you?.strength ?? 0.5;
  return [...rivals].sort(
    (a, b) =>
      Math.abs(a.strength - target) - Math.abs(b.strength - target) ||
      a.id.localeCompare(b.id),
  )[0];
}

/* ------------------------------------------------------------------ */
/* Head-to-head & season helpers                                       */
/* ------------------------------------------------------------------ */

export function seasonOver(state: CareerState): boolean {
  return state.round >= ROUNDS_PER_SEASON || state.status !== 'in_season';
}

/** Your goals scored so far this season. */
export function yourGoalsFor(state: CareerState): number {
  const row = computeStandings(state).find((r) => r.team.isYou);
  return row?.goalsFor ?? 0;
}

export type RivalResult = 'win' | 'draw' | 'loss' | 'unplayed';

/** Your result against a given rival this season. */
export function resultVsRival(state: CareerState, rivalId: string): RivalResult {
  for (const round of state.results) {
    for (const m of round) {
      const involvesYou = m.homeId === YOU_ID || m.awayId === YOU_ID;
      const involvesRival = m.homeId === rivalId || m.awayId === rivalId;
      if (!involvesYou || !involvesRival) continue;
      const youHome = m.homeId === YOU_ID;
      const yourGoals = youHome ? m.homeGoals : m.awayGoals;
      const oppGoals = youHome ? m.awayGoals : m.homeGoals;
      if (yourGoals > oppGoals) return 'win';
      if (yourGoals < oppGoals) return 'loss';
      return 'draw';
    }
  }
  return 'unplayed';
}

/* ------------------------------------------------------------------ */
/* Board objectives                                                    */
/* ------------------------------------------------------------------ */

export type ObjectiveStatus = 'pending' | 'met' | 'failed';

export interface Objective {
  id: string;
  label: string;
  status: ObjectiveStatus;
  /** Short progress hint, e.g. "12/15 goals". */
  progress?: string;
}

/** Board goals-scored target by tier (tougher divisions expect more). */
function goalsTarget(tier: number): number {
  return 11 + (BOTTOM_TIER - tier) * 2; // L2:11, L1:13, Champ:15, PL:17
}

function thresholdStatus(met: boolean, over: boolean): ObjectiveStatus {
  if (met) return 'met';
  return over ? 'failed' : 'pending';
}

/**
 * The board's objectives for the season, with live status. Pure: status is
 * "pending" until the season ends (or until a target is provably met/failed).
 */
export function seasonObjectives(state: CareerState): Objective[] {
  const over = seasonOver(state);
  const position = yourPosition(state);
  const objectives: Objective[] = [];

  // Primary expectation by tier.
  if (state.tier === TOP_TIER) {
    objectives.push({
      id: 'title',
      label: 'Win the league title',
      status: thresholdStatus(over && position === 1, over),
      progress: position > 0 ? `${ordinal(position)} now` : undefined,
    });
  } else {
    objectives.push({
      id: 'promotion',
      label: `Finish in the top ${PROMOTION_SPOTS} (promotion)`,
      status: thresholdStatus(over && position > 0 && position <= PROMOTION_SPOTS, over),
      progress: position > 0 ? `${ordinal(position)} now` : undefined,
    });
  }

  // Beat your rival.
  const rival = seasonRival(state);
  if (rival) {
    const r = resultVsRival(state, rival.id);
    const status: ObjectiveStatus =
      r === 'win' ? 'met' : r === 'unplayed' ? 'pending' : 'failed';
    objectives.push({
      id: 'rival',
      label: `Beat your rivals, ${rival.name}`,
      status,
      progress: r === 'unplayed' ? 'not played yet' : r,
    });
  }

  // Goals target.
  const gf = yourGoalsFor(state);
  const target = goalsTarget(state.tier);
  objectives.push({
    id: 'goals',
    label: `Score at least ${target} goals`,
    status: thresholdStatus(gf >= target, over),
    progress: `${gf}/${target} goals`,
  });

  // Avoid relegation (only when relegation is possible).
  if (state.tier < BOTTOM_TIER) {
    const safe = position > 0 && position <= TEAMS_PER_DIVISION - RELEGATION_SPOTS;
    objectives.push({
      id: 'safety',
      label: 'Avoid relegation',
      // Safety is "met" only once survival is confirmed at season's end.
      status: over ? (safe ? 'met' : 'failed') : 'pending',
      progress: position > 0 ? `${ordinal(position)} now` : undefined,
    });
  }

  return objectives;
}

/* ------------------------------------------------------------------ */
/* Board confidence & manager reputation                               */
/* ------------------------------------------------------------------ */

export interface BoardConfidence {
  /** 0–100. */
  value: number;
  label: string;
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/**
 * Board confidence (0–100) from your points-per-game and league position
 * relative to the board's promotion/title expectation.
 */
export function boardConfidence(state: CareerState): BoardConfidence {
  const row = computeStandings(state).find((r) => r.team.isYou);
  const played = row?.played ?? 0;
  const ppg = played > 0 ? (row?.points ?? 0) / played : 1.3;
  const position = yourPosition(state);

  // Expectation: promotion places are good, mid-table neutral, drop zone bad.
  let positionScore = 0;
  if (position > 0) {
    if (position <= PROMOTION_SPOTS) positionScore = 22;
    else if (position > TEAMS_PER_DIVISION - RELEGATION_SPOTS && state.tier < BOTTOM_TIER)
      positionScore = -28;
    else positionScore = 4;
  }

  const value = clamp(Math.round(50 + (ppg - 1.3) * 26 + positionScore), 0, 100);
  let label = 'Backing you';
  if (value < 25) label = 'Under serious pressure';
  else if (value < 45) label = 'Patience wearing thin';
  else if (value < 70) label = 'Cautiously optimistic';
  else if (value < 88) label = 'Firmly behind you';
  else label = 'Absolutely delighted';
  return { value, label };
}

export interface ManagerReputation {
  points: number;
  level: number;
  title: string;
}

const REPUTATION_TITLES = [
  'Rookie Gaffer',
  'Promising Boss',
  'Respected Manager',
  'Proven Winner',
  'Title-Winning Tactician',
  'Footballing Legend',
];

/**
 * Manager reputation accrues from trophies, how high you've climbed, and
 * seasons served. Derived (not stored), so it always reflects current state.
 */
export function managerReputation(state: CareerState): ManagerReputation {
  const trophyPts = state.trophies.length * 100;
  const climbPts = (BOTTOM_TIER - state.tier) * 60;
  const seasonPts = Math.max(0, state.season - 1) * 12;
  const points = trophyPts + climbPts + seasonPts;
  const level = Math.min(REPUTATION_TITLES.length, Math.floor(points / 120) + 1);
  return { points, level, title: REPUTATION_TITLES[level - 1] };
}

export function divisionLabel(tier: number): string {
  return divisionByTier(tier).name;
}

/** Resolve a team for display (helper used by the hub). */
export function rivalById(state: CareerState, id: string): CareerTeam | undefined {
  return teamById(state, id);
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
