import { describe, it, expect } from 'vitest';
import {
  PLAYERS,
  playerById,
  playersForClubPair,
  playersForClub,
  playersByNationality,
  playersByClubCountry,
} from '../data/players';
import {
  CLUBS,
  CANONICAL_CLUBS,
  canonicalClub,
  isCanonicalClub,
  clubInfo,
} from '../data/clubs';
import { CONTINENT_BY_NATION, autoAliases, leaguesForClubs, buildPlayer } from './playerDb';

const ROLES = ['goalkeeper', 'defender', 'midfielder', 'forward', 'winger', 'striker'];

describe('club registry', () => {
  it('has unique canonical names', () => {
    expect(new Set(CANONICAL_CLUBS).size).toBe(CANONICAL_CLUBS.length);
  });

  it('every alias resolves unambiguously to one canonical name', () => {
    const seen = new Map<string, string>();
    for (const c of CLUBS) {
      for (const a of c.aliases ?? []) {
        const key = a.toLowerCase();
        // An alias must not collide with a different canonical club.
        const prev = seen.get(key);
        expect(prev === undefined || prev === c.name).toBe(true);
        // And must not shadow some other club's canonical name.
        const asCanonical = CLUBS.find((x) => x.name.toLowerCase() === key && x.name !== c.name);
        expect(asCanonical).toBeUndefined();
        seen.set(key, c.name);
      }
    }
  });

  it('resolves common aliases', () => {
    expect(canonicalClub('Inter')).toBe('Inter Milan');
    expect(canonicalClub('Man Utd')).toBe('Manchester United');
    expect(canonicalClub('Spurs')).toBe('Tottenham Hotspur');
    expect(canonicalClub('PSG')).toBe('Paris Saint-Germain');
    expect(canonicalClub('Atletico Madrid')).toBe('Atlético Madrid');
  });

  it('keeps Inter Milan and Internacional distinct', () => {
    expect(canonicalClub('Inter')).toBe('Inter Milan');
    expect(canonicalClub('Internazionale')).toBe('Inter Milan');
    // The Brazilian club is its own canonical name — must NOT collapse to Inter Milan.
    expect(canonicalClub('Internacional')).toBe('Internacional');
    expect(isCanonicalClub('Internacional')).toBe(true);
    expect(clubInfo('Inter Porto Alegre')?.name).toBe('Internacional');
  });

  it('every club carries a country and league', () => {
    for (const c of CLUBS) {
      expect(c.country).toBeTruthy();
      expect(c.league).toBeTruthy();
    }
  });
});

describe('player roster integrity', () => {
  it('has a meaningful number of players', () => {
    expect(PLAYERS.length).toBeGreaterThan(150);
  });

  it('has unique ids', () => {
    const ids = PLAYERS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every club a player references is a canonical registry club', () => {
    const orphans: string[] = [];
    for (const p of PLAYERS) {
      for (const c of p.clubs) {
        if (!isCanonicalClub(c)) orphans.push(`${p.id}: ${c}`);
      }
    }
    expect(orphans).toEqual([]);
  });

  it('stores clubs in canonical form (no un-normalised variants)', () => {
    for (const p of PLAYERS) {
      for (const c of p.clubs) {
        expect(canonicalClub(c)).toBe(c);
      }
    }
  });

  it('every nationality maps to a known continent', () => {
    const unknown = [...new Set(PLAYERS.map((p) => p.nationality))].filter(
      (n) => !(n in CONTINENT_BY_NATION),
    );
    expect(unknown).toEqual([]);
  });

  it('every player has valid core fields', () => {
    for (const p of PLAYERS) {
      expect(p.id).toBeTruthy();
      expect(p.name).toBeTruthy();
      expect(p.positions.length).toBeGreaterThan(0);
      expect(p.positions).toContain(p.primaryPosition);
      expect(p.positions.every((r) => ROLES.includes(r))).toBe(true);
      expect(p.clubs.length).toBeGreaterThan(0);
      expect(p.leagues.length).toBeGreaterThan(0);
      expect(p.debutYear).toBeGreaterThan(1900);
      expect(p.active).toBe(p.lastYear === undefined);
      if (p.lastYear !== undefined) expect(p.lastYear).toBeGreaterThanOrEqual(p.debutYear);
      // Multi-word names get at least a surname alias; mononyms (Pelé, Xavi) need none.
      if (p.name.split(/\s+/).length > 1) expect(p.aliases.length).toBeGreaterThan(0);
    }
  });

  it('birth year, when present, is sane (plausible career ages)', () => {
    for (const p of PLAYERS) {
      if (p.birthYear === undefined) continue;
      expect(p.birthYear).toBeGreaterThan(1925);
      expect(p.birthYear).toBeLessThan(2010);
      expect(p.birthYear).toBeLessThan(p.debutYear);
      // Debut age must be realistic (catches a swapped/typo'd year).
      const debutAge = p.debutYear - p.birthYear;
      expect(debutAge).toBeGreaterThanOrEqual(14);
      expect(debutAge).toBeLessThanOrEqual(32);
      // Nobody plays past their late 40s (Buffon retired at 45).
      if (p.lastYear !== undefined) expect(p.lastYear - p.birthYear).toBeLessThanOrEqual(46);
    }
  });
});

describe('builder', () => {
  it('derives a surname alias and a particle alias', () => {
    expect(autoAliases('Cristiano Ronaldo')).toContain('Ronaldo');
    expect(autoAliases('Virgil van Dijk')).toContain('van Dijk');
    expect(autoAliases('Pelé')).toEqual([]); // single token → none
  });

  it('derives leagues from clubs when not given', () => {
    expect(leaguesForClubs(['Arsenal', 'Barcelona'])).toEqual(['Premier League', 'La Liga']);
  });

  it('canonicalises club spellings on build', () => {
    const p = buildPlayer({
      id: 'test',
      name: 'Test Player',
      nationality: 'England',
      positions: ['midfielder'],
      clubs: ['Inter', 'Man Utd'],
      debutYear: 2010,
      won: '',
    });
    expect(p.clubs).toEqual(['Inter Milan', 'Manchester United']);
  });
});

describe('queries (cross-mode reuse)', () => {
  it('finds players who played for both clubs (Connections engine)', () => {
    const both = playersForClubPair('Arsenal', 'Barcelona').map((p) => p.id);
    expect(both).toContain('thierry_henry');
  });

  it('resolves aliases inside club-pair queries', () => {
    // Patrick Vieira played for Arsenal and Inter Milan.
    const both = playersForClubPair('Inter', 'Arsenal').map((p) => p.id);
    expect(both).toContain('patrick_vieira');
  });

  it('returns nobody for a club paired with itself', () => {
    expect(playersForClubPair('Arsenal', 'Arsenal')).toEqual([]);
  });

  it('filters by club, nationality and club-country', () => {
    expect(playersForClub('Real Madrid').length).toBeGreaterThan(5);
    expect(playersByNationality('Brazil').every((p) => p.nationality === 'Brazil')).toBe(true);
    expect(playersByClubCountry('Italy').length).toBeGreaterThan(5);
  });

  it('looks players up by id', () => {
    expect(playerById('lionel_messi')?.name).toBe('Lionel Messi');
    expect(playerById('nope')).toBeUndefined();
  });
});
