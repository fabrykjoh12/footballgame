/**
 * Mystery Player Duel roster — now a thin view over the central player database
 * (`src/data/players.ts`). The structured fields verified questions rely on
 * (clubs, leagues, nationality, continent, positions, era, trophies) come
 * straight from each `Player`; this adapter just shapes them into the
 * `MysteryPlayer` the duel engine expects.
 *
 * Curated, men's-football-only. No photos/badges anywhere — names + metadata.
 */

import { PLAYERS } from './players';
import type { MysteryPlayer } from '../lib/mysteryPlayer/mysteryPlayerTypes';
import type { Player } from '../lib/playerDb';

function toMysteryPlayer(p: Player): MysteryPlayer {
  return {
    id: p.id,
    name: p.name,
    nationality: p.nationality,
    continent: p.continent,
    positions: p.positions,
    primaryPosition: p.primaryPosition,
    clubs: p.clubs,
    leagues: p.leagues,
    debutYear: p.debutYear,
    lastYear: p.lastYear,
    active: p.active,
    won: {
      championsLeague: p.trophies.championsLeague,
      ballonDor: p.trophies.ballonDor,
      worldCup: p.trophies.worldCup,
      euros: p.trophies.euros,
      copaAmerica: p.trophies.copaAmerica,
      leagueTitle: p.trophies.leagueTitle,
    },
  };
}

export const MYSTERY_PLAYERS: MysteryPlayer[] = PLAYERS.map(toMysteryPlayer);

export function mysteryPlayerById(id: string): MysteryPlayer | undefined {
  return MYSTERY_PLAYERS.find((p) => p.id === id);
}
