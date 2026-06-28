/**
 * Central player database — types, builder, and pure query layer.
 *
 * One curated, men's-football-only roster of stable facts (clubs, nationality,
 * position, era, trophies) that ANY game mode can query: Connections, Mystery
 * Player Duel, career-path questions, who-am-I clue seeds, and more. No live
 * stats (goal tallies, fees) — those rot and need re-sourcing every season.
 *
 * Authoring lives in `src/data/players.ts` as compact `PlayerSeed`s; this module
 * turns each seed into a full `Player` (derives continent, trophies, aliases,
 * and leagues from the club registry) and exposes queries over a `Player[]`.
 * The bound, dataset-aware API is re-exported from `src/data/players.ts`.
 *
 * No badges/photos anywhere — names + metadata only.
 */

import { canonicalClub, leagueForClub, countryForClub } from '../data/clubs';

export type PlayerRole =
  | 'goalkeeper'
  | 'defender'
  | 'midfielder'
  | 'forward'
  | 'winger'
  | 'striker';

export type Continent =
  | 'Europe'
  | 'South America'
  | 'North America'
  | 'Africa'
  | 'Asia'
  | 'Oceania';

export interface TrophySet {
  championsLeague: boolean;
  ballonDor: boolean;
  worldCup: boolean;
  euros: boolean;
  copaAmerica: boolean;
  leagueTitle: boolean;
}

/** A full player record with derived fields. */
export interface Player {
  id: string;
  name: string;
  /** Accepted alternative names for typed/fuzzy matching (surname, nicknames). */
  aliases: string[];
  nationality: string;
  continent: Continent;
  positions: PlayerRole[];
  primaryPosition: PlayerRole;
  /** Canonical club names, senior career order. */
  clubs: string[];
  /** Leagues played in (derived from clubs unless overridden). */
  leagues: string[];
  /** Year of birth (stable fact; omitted where not yet recorded). */
  birthYear?: number;
  debutYear: number;
  lastYear?: number;
  active: boolean;
  trophies: TrophySet;
  /** Optional flavour tags ('iconic', 'one-club-man', 'galactico', …). */
  tags: string[];
}

/** Compact authoring shape — see `src/data/players.ts`. */
export interface PlayerSeed {
  id: string;
  name: string;
  nationality: string;
  positions: PlayerRole[];
  /** Clubs in career order (any known spelling; canonicalised on build). */
  clubs: string[];
  /** Optional explicit leagues; derived from clubs when omitted. */
  leagues?: string[];
  /** Year of birth (stable fact; optional). */
  birthYear?: number;
  debutYear: number;
  lastYear?: number;
  /** Space-separated trophy tokens: cl bd wc eu cp lg. */
  won: string;
  /** Extra accepted names beyond the auto-derived surname. */
  aliases?: string[];
  tags?: string[];
}

/* ------------------------------------------------------------------ */
/* Nationality → continent                                             */
/* ------------------------------------------------------------------ */

export const CONTINENT_BY_NATION: Record<string, Continent> = {
  // Europe
  England: 'Europe', Scotland: 'Europe', Wales: 'Europe', 'Northern Ireland': 'Europe',
  'Republic of Ireland': 'Europe', Ireland: 'Europe', France: 'Europe', Spain: 'Europe',
  Portugal: 'Europe', Germany: 'Europe', Italy: 'Europe', Netherlands: 'Europe',
  Belgium: 'Europe', Croatia: 'Europe', Poland: 'Europe', Norway: 'Europe',
  Sweden: 'Europe', Denmark: 'Europe', Switzerland: 'Europe', Austria: 'Europe',
  'Czech Republic': 'Europe', Slovenia: 'Europe', Slovakia: 'Europe', Serbia: 'Europe',
  Ukraine: 'Europe', Russia: 'Europe', Bulgaria: 'Europe', Romania: 'Europe',
  Greece: 'Europe', Turkey: 'Europe', Hungary: 'Europe', Finland: 'Europe',
  Georgia: 'Europe', Iceland: 'Europe', Bosnia: 'Europe', 'Bosnia and Herzegovina': 'Europe',
  // South America
  Brazil: 'South America', Argentina: 'South America', Uruguay: 'South America',
  Colombia: 'South America', Chile: 'South America', Peru: 'South America',
  Ecuador: 'South America', Paraguay: 'South America', Venezuela: 'South America',
  // Africa
  Egypt: 'Africa', 'Ivory Coast': 'Africa', Senegal: 'Africa', Cameroon: 'Africa',
  Nigeria: 'Africa', Ghana: 'Africa', Algeria: 'Africa', Morocco: 'Africa',
  Tunisia: 'Africa', Gabon: 'Africa', Liberia: 'Africa', Mali: 'Africa',
  'South Africa': 'Africa', Togo: 'Africa', 'DR Congo': 'Africa', Guinea: 'Africa',
  // North America
  'United States': 'North America', USA: 'North America', Mexico: 'North America',
  Canada: 'North America', 'Costa Rica': 'North America', Jamaica: 'North America',
  // Asia
  'South Korea': 'Asia', Japan: 'Asia', Iran: 'Asia', 'Saudi Arabia': 'Asia',
  Qatar: 'Asia', Australia: 'Oceania', 'New Zealand': 'Oceania',
};

export function continentOf(nationality: string): Continent {
  return CONTINENT_BY_NATION[nationality] ?? 'Europe';
}

/* ------------------------------------------------------------------ */
/* Builder                                                             */
/* ------------------------------------------------------------------ */

const PARTICLES = new Set(['van', 'von', 'de', 'del', 'der', 'den', 'dos', 'da', 'di', 'el', 'al', "n'"]);

/** Derive default accepted names (surname, surname-with-particle) from a name. */
export function autoAliases(name: string): string[] {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length < 2) return [];
  const out = new Set<string>();
  const last = parts[parts.length - 1];
  out.add(last);
  // Include a particle prefix, e.g. "van Dijk", "De Bruyne".
  const prev = parts[parts.length - 2];
  if (prev && PARTICLES.has(prev.toLowerCase())) out.add(`${prev} ${last}`);
  return [...out];
}

function parseTrophies(won: string): TrophySet {
  const t = new Set(won.split(/\s+/).filter(Boolean));
  return {
    championsLeague: t.has('cl'),
    ballonDor: t.has('bd'),
    worldCup: t.has('wc'),
    euros: t.has('eu'),
    copaAmerica: t.has('cp'),
    leagueTitle: t.has('lg'),
  };
}

/** Derive the unique leagues a set of clubs belong to (registry order-stable). */
export function leaguesForClubs(clubs: string[]): string[] {
  const out: string[] = [];
  for (const c of clubs) {
    const lg = leagueForClub(c);
    if (lg && !out.includes(lg)) out.push(lg);
  }
  return out;
}

/** Turn a compact seed into a full, derived Player record. */
export function buildPlayer(seed: PlayerSeed): Player {
  const clubs = seed.clubs.map(canonicalClub);
  const leagues = seed.leagues ?? leaguesForClubs(clubs);
  const aliases = [...new Set([...autoAliases(seed.name), ...(seed.aliases ?? [])])];
  return {
    id: seed.id,
    name: seed.name,
    aliases,
    nationality: seed.nationality,
    continent: continentOf(seed.nationality),
    positions: seed.positions,
    primaryPosition: seed.positions[0],
    clubs,
    leagues,
    birthYear: seed.birthYear,
    debutYear: seed.debutYear,
    lastYear: seed.lastYear,
    active: seed.lastYear === undefined,
    trophies: parseTrophies(seed.won),
    tags: seed.tags ?? [],
  };
}

/* ------------------------------------------------------------------ */
/* Pure queries (operate on any Player[])                              */
/* ------------------------------------------------------------------ */

export function findById(players: Player[], id: string): Player | undefined {
  return players.find((p) => p.id === id);
}

/** Players who played for `club` (any known spelling). */
export function playedForClub(players: Player[], club: string): Player[] {
  const target = canonicalClub(club);
  return players.filter((p) => p.clubs.includes(target));
}

/** Players who played for BOTH clubs — the engine behind Connections. */
export function playedForBoth(players: Player[], clubA: string, clubB: string): Player[] {
  const a = canonicalClub(clubA);
  const b = canonicalClub(clubB);
  if (a === b) return [];
  return players.filter((p) => p.clubs.includes(a) && p.clubs.includes(b));
}

export function byNationality(players: Player[], nationality: string): Player[] {
  return players.filter((p) => p.nationality === nationality);
}

export function byPosition(players: Player[], role: PlayerRole): Player[] {
  return players.filter((p) => p.positions.includes(role));
}

export function byLeague(players: Player[], league: string): Player[] {
  return players.filter((p) => p.leagues.includes(league));
}

/** Players who turned out in `country` (via any club from that country). */
export function byClubCountry(players: Player[], country: string): Player[] {
  return players.filter((p) => p.clubs.some((c) => countryForClub(c) === country));
}

/** Players whose senior career overlapped a calendar year. */
export function activeInYear(players: Player[], year: number): Player[] {
  return players.filter((p) => p.debutYear <= year && (p.lastYear ?? 9999) >= year);
}

/** A player's club chain — the basis for career-path questions. */
export function careerChain(player: Player): string[] {
  return player.clubs;
}

/**
 * Vague→specific clue seeds for a who-am-I style prompt (men's football).
 * Returns plain strings the caller can render; wording is intentionally simple.
 */
export function cluesFor(player: Player): string[] {
  const clues: string[] = [];
  const decade = `${Math.floor(player.debutYear / 10) * 10}s`;
  clues.push(`A ${player.nationality} ${player.primaryPosition} who emerged in the ${decade}.`);
  if (player.continent) clues.push(`Made their name in ${player.continent}.`);
  if (player.trophies.worldCup) clues.push('Has won the World Cup.');
  if (player.trophies.ballonDor) clues.push("Has won the Ballon d'Or.");
  if (player.trophies.championsLeague) clues.push('Has lifted the Champions League.');
  if (player.clubs.length) clues.push(`Played for ${player.clubs[player.clubs.length - 1]}.`);
  if (player.clubs.length > 1) clues.push(`Once turned out for ${player.clubs[0]}.`);
  return clues;
}
