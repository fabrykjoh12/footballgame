/**
 * Mystery Player Duel — verified question catalogue, answers and labels (pure).
 *
 * Verified questions are answered automatically from a player's metadata, which
 * makes the mode lie-proof, filterable and testable. Free questions are handled
 * separately (manual answers, logged only).
 */

import { MYSTERY_PLAYERS } from '../../data/mysteryPlayers';
import {
  TOP_FIVE_LEAGUES,
  type Continent,
  type EraKey,
  type MysteryPlayer,
  type PlayerRole,
  type StatusKey,
  type TrophyKey,
  type VerifiedQuestion,
} from './mysteryPlayerTypes';

/** Reference "current" season, so era answers are deterministic + test-stable. */
export const SEASON_YEAR = 2025;

/** The decade buckets a career touches. */
function careerSpan(p: MysteryPlayer): [number, number] {
  return [p.debutYear, p.lastYear ?? SEASON_YEAR];
}

function topFiveLeagueCount(p: MysteryPlayer): number {
  return TOP_FIVE_LEAGUES.filter((l) => p.leagues.includes(l)).length;
}

/** Answer a verified question for a given player, purely from metadata. */
export function answerVerified(p: MysteryPlayer, q: VerifiedQuestion): boolean {
  switch (q.kind) {
    case 'club':
      return p.clubs.includes(q.value);
    case 'league':
      return p.leagues.includes(q.value);
    case 'country':
      return p.nationality === q.value;
    case 'continent':
      return p.continent === q.value;
    case 'position':
      return p.positions.includes(q.value);
    case 'trophy':
      switch (q.value) {
        case 'cl':
          return p.won.championsLeague;
        case 'ballon_dor':
          return p.won.ballonDor;
        case 'world_cup':
          return p.won.worldCup;
        case 'euros':
          return p.won.euros;
        case 'copa':
          return p.won.copaAmerica;
        case 'league':
          return p.won.leagueTitle;
      }
      return false;
    case 'status':
      switch (q.value) {
        case 'active':
          return p.active;
        case 'retired':
          return !p.active;
        case 'multi_top5':
          return topFiveLeagueCount(p) >= 2;
        case 'over_three_clubs':
          return p.clubs.length > 3;
      }
      return false;
    case 'era': {
      const [from, to] = careerSpan(p);
      switch (q.value) {
        case 'before_2010':
          return from < 2010;
        case 'after_2010':
          return to >= 2010;
        case '2000s':
          return from <= 2009 && to >= 2000;
        case '2010s':
          return from <= 2019 && to >= 2010;
        case '2020s':
          return from <= SEASON_YEAR && to >= 2020;
      }
      return false;
    }
  }
}

/* ------------------------------------------------------------------ */
/* Human-readable labels                                               */
/* ------------------------------------------------------------------ */

const TROPHY_LABEL: Record<TrophyKey, string> = {
  cl: 'won the Champions League',
  ballon_dor: 'won the Ballon d’Or',
  world_cup: 'won the World Cup',
  euros: 'won the Euros',
  copa: 'won the Copa América',
  league: 'won a league title',
};

const STATUS_LABEL: Record<StatusKey, string> = {
  active: 'is your player still active?',
  retired: 'is your player retired?',
  multi_top5: 'has your player played in more than one top-five league?',
  over_three_clubs: 'has your player played for more than three clubs?',
};

const ERA_LABEL: Record<EraKey, string> = {
  before_2010: 'did your player play before 2010?',
  after_2010: 'did your player play after 2010?',
  '2000s': 'was your player active in the 2000s?',
  '2010s': 'was your player active in the 2010s?',
  '2020s': 'was your player active in the 2020s?',
};

const ROLE_LABEL: Record<PlayerRole, string> = {
  goalkeeper: 'a goalkeeper',
  defender: 'a defender',
  midfielder: 'a midfielder',
  forward: 'a forward',
  winger: 'a winger',
  striker: 'a striker',
};

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** A full, capitalised question sentence for the history / builder. */
export function questionLabel(q: VerifiedQuestion): string {
  switch (q.kind) {
    case 'club':
      return `Has your player played for ${q.value}?`;
    case 'league':
      return `Has your player played in ${q.value}?`;
    case 'country':
      return `Is your player from ${q.value}?`;
    case 'continent':
      return `Is your player from ${q.value}?`;
    case 'position':
      return `Is your player ${ROLE_LABEL[q.value]}?`;
    case 'trophy':
      return `Has your player ${TROPHY_LABEL[q.value]}?`;
    case 'status':
      return cap(STATUS_LABEL[q.value]);
    case 'era':
      return cap(ERA_LABEL[q.value]);
  }
}

/* ------------------------------------------------------------------ */
/* Builder catalogues (derived from the dataset where relevant)        */
/* ------------------------------------------------------------------ */

function uniqueSorted(items: string[]): string[] {
  return [...new Set(items)].sort((a, b) => a.localeCompare(b));
}

export const CLUB_OPTIONS = uniqueSorted(MYSTERY_PLAYERS.flatMap((p) => p.clubs));
export const COUNTRY_OPTIONS = uniqueSorted(MYSTERY_PLAYERS.map((p) => p.nationality));
export const LEAGUE_OPTIONS = (() => {
  const present = uniqueSorted(MYSTERY_PLAYERS.flatMap((p) => p.leagues));
  const top = TOP_FIVE_LEAGUES.filter((l) => present.includes(l));
  const rest = present.filter((l) => !top.includes(l as (typeof TOP_FIVE_LEAGUES)[number]));
  return [...top, ...rest];
})();

export const CONTINENT_OPTIONS: Continent[] = [
  'Europe', 'South America', 'North America', 'Africa', 'Asia', 'Oceania',
];

export const POSITION_OPTIONS: PlayerRole[] = [
  'goalkeeper', 'defender', 'midfielder', 'forward', 'winger', 'striker',
];

export const TROPHY_OPTIONS: TrophyKey[] = ['cl', 'ballon_dor', 'world_cup', 'euros', 'copa', 'league'];
export const STATUS_OPTIONS: StatusKey[] = ['active', 'retired', 'multi_top5', 'over_three_clubs'];
export const ERA_OPTIONS: EraKey[] = ['before_2010', 'after_2010', '2000s', '2010s', '2020s'];

/** Short label for a trophy/status/era option in the builder chip. */
export function optionLabel(q: VerifiedQuestion): string {
  switch (q.kind) {
    case 'trophy':
      return cap(TROPHY_LABEL[q.value]);
    case 'status':
      return cap(STATUS_LABEL[q.value].replace(/\?$/, ''));
    case 'era':
      return cap(ERA_LABEL[q.value].replace(/\?$/, ''));
    default:
      return questionLabel(q);
  }
}
