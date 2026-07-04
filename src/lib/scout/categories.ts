/**
 * The Scout — category catalog + player-name resolution.
 *
 * A "scouting rule" is a secret category over the central player DB (played
 * for a club, a nationality, a position, a trophy, an era…). The catalog is
 * generated from player facts so every rule is auto-verifiable — the game can
 * answer "fits / doesn't fit" for any probed player with no human judgement.
 *
 * Balance guards: a rule must match at least SCOUT_MIN_POOL players (so it's
 * discoverable through probing) and at most SCOUT_MAX_POOL_SHARE of the roster
 * (a rule matching almost everyone is undeducible noise). Both are enforced
 * here and asserted by tests, so the catalog stays sound as the roster grows.
 */

import { PLAYERS } from '../../data/players';
import type { Player, PlayerRole } from '../playerDb';

export type ScoutCategoryKind =
  | 'nationality'
  | 'continent'
  | 'club'
  | 'league'
  | 'position'
  | 'trophy'
  | 'era';

export interface ScoutCategory {
  id: string;
  /** Short human rule, e.g. "Played for Real Madrid". */
  label: string;
  kind: ScoutCategoryKind;
  test: (p: Player) => boolean;
}

export const SCOUT_MIN_POOL = 10;
export const SCOUT_MAX_POOL_SHARE = 0.6;

const POSITION_LABEL: Record<PlayerRole, string> = {
  goalkeeper: 'Goalkeepers',
  defender: 'Defenders',
  midfielder: 'Midfielders',
  forward: 'Forwards',
  winger: 'Wingers',
  striker: 'Strikers',
};

const TROPHY_DEFS = [
  { token: 'cl', label: 'Won the Champions League', test: (p: Player) => p.trophies.championsLeague },
  { token: 'wc', label: 'Won the World Cup', test: (p: Player) => p.trophies.worldCup },
  { token: 'bd', label: "Won the Ballon d'Or", test: (p: Player) => p.trophies.ballonDor },
  { token: 'eu', label: 'Won the Euros', test: (p: Player) => p.trophies.euros },
  { token: 'cp', label: 'Won the Copa América', test: (p: Player) => p.trophies.copaAmerica },
  { token: 'lg', label: 'Won a league title', test: (p: Player) => p.trophies.leagueTitle },
] as const;

const ERA_DEFS = [
  { slug: 'born-pre-1980', label: 'Born before 1980', test: (p: Player) => p.birthYear !== undefined && p.birthYear < 1980 },
  { slug: 'born-1990-plus', label: 'Born in 1990 or later', test: (p: Player) => p.birthYear !== undefined && p.birthYear >= 1990 },
  { slug: 'debut-pre-2000', label: 'Debuted before 2000', test: (p: Player) => p.debutYear < 2000 },
  { slug: 'debut-2015-plus', label: 'Debuted in 2015 or later', test: (p: Player) => p.debutYear >= 2015 },
  { slug: 'active', label: 'Still playing', test: (p: Player) => p.active },
  { slug: 'retired', label: 'Retired', test: (p: Player) => !p.active },
] as const;

/** Build the full balanced catalog for a roster. Deterministic and pure. */
export function buildScoutCatalog(players: Player[] = PLAYERS): ScoutCategory[] {
  const out: ScoutCategory[] = [];
  const maxPool = Math.floor(players.length * SCOUT_MAX_POOL_SHARE);

  const add = (id: string, label: string, kind: ScoutCategoryKind, test: (p: Player) => boolean) => {
    const size = players.reduce((n, p) => n + (test(p) ? 1 : 0), 0);
    if (size >= SCOUT_MIN_POOL && size <= maxPool) out.push({ id, label, kind, test });
  };

  const nationalities = [...new Set(players.map((p) => p.nationality))].sort();
  for (const nat of nationalities) {
    add(`nat:${nat}`, `${nat} internationals`, 'nationality', (p) => p.nationality === nat);
  }

  const continents = [...new Set(players.map((p) => p.continent))].sort();
  for (const cont of continents) {
    add(`continent:${cont}`, `From ${cont}`, 'continent', (p) => p.continent === cont);
  }

  const clubs = [...new Set(players.flatMap((p) => p.clubs))].sort();
  for (const club of clubs) {
    add(`club:${club}`, `Played for ${club}`, 'club', (p) => p.clubs.includes(club));
  }

  const leagues = [...new Set(players.flatMap((p) => p.leagues))].sort();
  for (const lg of leagues) {
    add(`league:${lg}`, `Played in ${lg}`, 'league', (p) => p.leagues.includes(lg));
  }

  for (const role of Object.keys(POSITION_LABEL) as PlayerRole[]) {
    add(`pos:${role}`, POSITION_LABEL[role], 'position', (p) => p.positions.includes(role));
  }

  for (const t of TROPHY_DEFS) add(`trophy:${t.token}`, t.label, 'trophy', t.test);
  for (const e of ERA_DEFS) add(`era:${e.slug}`, e.label, 'era', e.test);

  return out;
}

let cached: ScoutCategory[] | null = null;

/** The catalog over the live roster (memoized — the roster is static). */
export function scoutCatalog(): ScoutCategory[] {
  return (cached ??= buildScoutCatalog());
}

export function scoutCategoryById(id: string, catalog: ScoutCategory[] = scoutCatalog()): ScoutCategory | undefined {
  return catalog.find((c) => c.id === id);
}

/** All roster players a rule matches (for reveals + CPU reasoning). */
export function categoryMembers(cat: ScoutCategory, players: Player[] = PLAYERS): Player[] {
  return players.filter(cat.test);
}

/* ------------------------------------------------------------------ */
/* Typed player probes — forgiving name resolution                     */
/* ------------------------------------------------------------------ */

/** Accent/case/punctuation-insensitive key (local copy — keeps the scout
 * chunk from dragging in the Connections puzzle bank). */
export function normalizeScoutName(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Resolve a typed name to one roster player, or null when unknown/ambiguous
 * (the UI then leans on suggestions). Full name beats alias; a surname shared
 * by several players resolves only via the full name.
 */
export function resolveScoutPlayer(input: string, players: Player[] = PLAYERS): Player | null {
  const q = normalizeScoutName(input);
  if (!q) return null;
  const exact = players.filter((p) => normalizeScoutName(p.name) === q);
  if (exact.length >= 1) return exact[0];
  const byAlias = players.filter((p) => p.aliases.some((a) => normalizeScoutName(a) === q));
  return byAlias.length === 1 ? byAlias[0] : null;
}

/** Name suggestions for the probe input, drawn from the whole roster. */
export function suggestScoutPlayers(query: string, limit = 6, players: Player[] = PLAYERS): string[] {
  const q = normalizeScoutName(query);
  if (q.length < 2) return [];
  const starts: string[] = [];
  const contains: string[] = [];
  for (const p of players) {
    const key = normalizeScoutName(p.name);
    const aliasHit = p.aliases.some((a) => normalizeScoutName(a).startsWith(q));
    if (key.startsWith(q) || aliasHit) starts.push(p.name);
    else if (key.includes(q)) contains.push(p.name);
  }
  return [...starts, ...contains].slice(0, limit);
}
