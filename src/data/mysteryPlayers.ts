/**
 * Mystery Player Duel — player database with structured metadata.
 *
 * Curated, men's-football-only. No photos/badges anywhere — names + metadata
 * only. Verified questions are answered purely from these fields, so internal
 * consistency is what makes the mode fair. `active` and `era` are derived from
 * the career years; top-five league flags are derived from `leagues`.
 */

import type { Continent, MysteryPlayer, PlayerRole } from '../lib/mysteryPlayer/mysteryPlayerTypes';

const CONTINENT_BY_NATION: Record<string, Continent> = {
  Belgium: 'Europe', Norway: 'Europe', Argentina: 'South America', Portugal: 'Europe',
  France: 'Europe', Brazil: 'South America', Egypt: 'Africa', Poland: 'Europe',
  Croatia: 'Europe', Netherlands: 'Europe', England: 'Europe', Spain: 'Europe',
  Germany: 'Europe', Italy: 'Europe', Uruguay: 'South America', "Ivory Coast": 'Africa',
  Algeria: 'Africa', 'South Korea': 'Asia',
};

interface Shorthand {
  id: string;
  name: string;
  nationality: string;
  positions: PlayerRole[];
  clubs: string[];
  leagues: string[];
  debutYear: number;
  lastYear?: number;
  /** Space-separated trophy tokens: cl bd wc eu cp lg. */
  won: string;
}

function build(s: Shorthand): MysteryPlayer {
  const tokens = new Set(s.won.split(/\s+/).filter(Boolean));
  const continent = CONTINENT_BY_NATION[s.nationality] ?? 'Europe';
  return {
    id: s.id,
    name: s.name,
    nationality: s.nationality,
    continent,
    positions: s.positions,
    primaryPosition: s.positions[0],
    clubs: s.clubs,
    leagues: s.leagues,
    debutYear: s.debutYear,
    lastYear: s.lastYear,
    active: s.lastYear === undefined,
    won: {
      championsLeague: tokens.has('cl'),
      ballonDor: tokens.has('bd'),
      worldCup: tokens.has('wc'),
      euros: tokens.has('eu'),
      copaAmerica: tokens.has('cp'),
      leagueTitle: tokens.has('lg'),
    },
  };
}

const PL = 'Premier League';
const LL = 'La Liga';
const SA = 'Serie A';
const BL = 'Bundesliga';
const L1 = 'Ligue 1';

const RAW: Shorthand[] = [
  { id: 'kevin_de_bruyne', name: 'Kevin De Bruyne', nationality: 'Belgium', positions: ['midfielder'], clubs: ['Genk', 'Chelsea', 'Werder Bremen', 'Wolfsburg', 'Manchester City'], leagues: ['Belgian Pro League', PL, BL], debutYear: 2008, won: 'cl lg' },
  { id: 'erling_haaland', name: 'Erling Haaland', nationality: 'Norway', positions: ['forward', 'striker'], clubs: ['Bryne', 'Molde', 'Red Bull Salzburg', 'Borussia Dortmund', 'Manchester City'], leagues: ['Eliteserien', 'Austrian Bundesliga', BL, PL], debutYear: 2016, won: 'cl lg' },
  { id: 'lionel_messi', name: 'Lionel Messi', nationality: 'Argentina', positions: ['forward', 'winger'], clubs: ['Barcelona', 'Paris Saint-Germain', 'Inter Miami'], leagues: [LL, L1, 'MLS'], debutYear: 2004, won: 'cl bd wc cp lg' },
  { id: 'cristiano_ronaldo', name: 'Cristiano Ronaldo', nationality: 'Portugal', positions: ['forward', 'winger', 'striker'], clubs: ['Sporting CP', 'Manchester United', 'Real Madrid', 'Juventus', 'Al Nassr'], leagues: ['Primeira Liga', PL, LL, SA, 'Saudi Pro League'], debutYear: 2002, won: 'cl bd eu lg' },
  { id: 'kylian_mbappe', name: 'Kylian Mbappé', nationality: 'France', positions: ['forward', 'striker', 'winger'], clubs: ['Monaco', 'Paris Saint-Germain', 'Real Madrid'], leagues: [L1, LL], debutYear: 2015, won: 'wc lg' },
  { id: 'neymar', name: 'Neymar', nationality: 'Brazil', positions: ['forward', 'winger'], clubs: ['Santos', 'Barcelona', 'Paris Saint-Germain', 'Al Hilal'], leagues: ['Brazilian Série A', LL, L1, 'Saudi Pro League'], debutYear: 2009, won: 'cl lg' },
  { id: 'mohamed_salah', name: 'Mohamed Salah', nationality: 'Egypt', positions: ['forward', 'winger'], clubs: ['Basel', 'Chelsea', 'Fiorentina', 'Roma', 'Liverpool'], leagues: ['Swiss Super League', PL, SA], debutYear: 2010, won: 'cl lg' },
  { id: 'robert_lewandowski', name: 'Robert Lewandowski', nationality: 'Poland', positions: ['striker', 'forward'], clubs: ['Lech Poznań', 'Borussia Dortmund', 'Bayern Munich', 'Barcelona'], leagues: ['Ekstraklasa', BL, LL], debutYear: 2006, won: 'cl lg' },
  { id: 'luka_modric', name: 'Luka Modrić', nationality: 'Croatia', positions: ['midfielder'], clubs: ['Dinamo Zagreb', 'Tottenham Hotspur', 'Real Madrid'], leagues: ['Croatian First League', PL, LL], debutYear: 2003, won: 'cl bd lg' },
  { id: 'virgil_van_dijk', name: 'Virgil van Dijk', nationality: 'Netherlands', positions: ['defender'], clubs: ['Groningen', 'Celtic', 'Southampton', 'Liverpool'], leagues: ['Eredivisie', 'Scottish Premiership', PL], debutYear: 2011, won: 'cl lg' },
  { id: 'harry_kane', name: 'Harry Kane', nationality: 'England', positions: ['striker', 'forward'], clubs: ['Tottenham Hotspur', 'Bayern Munich'], leagues: [PL, BL], debutYear: 2011, won: 'lg' },
  { id: 'bruno_fernandes', name: 'Bruno Fernandes', nationality: 'Portugal', positions: ['midfielder'], clubs: ['Novara', 'Udinese', 'Sampdoria', 'Sporting CP', 'Manchester United'], leagues: [SA, 'Primeira Liga', PL], debutYear: 2012, won: '' },
  { id: 'bukayo_saka', name: 'Bukayo Saka', nationality: 'England', positions: ['winger', 'forward'], clubs: ['Arsenal'], leagues: [PL], debutYear: 2018, won: '' },
  { id: 'jude_bellingham', name: 'Jude Bellingham', nationality: 'England', positions: ['midfielder'], clubs: ['Birmingham City', 'Borussia Dortmund', 'Real Madrid'], leagues: ['EFL Championship', BL, LL], debutYear: 2019, won: 'cl lg' },
  { id: 'vinicius_junior', name: 'Vinícius Júnior', nationality: 'Brazil', positions: ['forward', 'winger'], clubs: ['Flamengo', 'Real Madrid'], leagues: ['Brazilian Série A', LL], debutYear: 2017, won: 'cl lg' },
  { id: 'rodri', name: 'Rodri', nationality: 'Spain', positions: ['midfielder'], clubs: ['Villarreal', 'Atlético Madrid', 'Manchester City'], leagues: [LL, PL], debutYear: 2015, won: 'cl bd eu lg' },
  { id: 'martin_odegaard', name: 'Martin Ødegaard', nationality: 'Norway', positions: ['midfielder'], clubs: ['Strømsgodset', 'Real Madrid', 'Real Sociedad', 'Arsenal'], leagues: ['Eliteserien', LL, PL], debutYear: 2014, won: '' },
  { id: 'bernardo_silva', name: 'Bernardo Silva', nationality: 'Portugal', positions: ['midfielder', 'winger'], clubs: ['Benfica', 'Monaco', 'Manchester City'], leagues: ['Primeira Liga', L1, PL], debutYear: 2013, won: 'cl lg' },
  { id: 'antoine_griezmann', name: 'Antoine Griezmann', nationality: 'France', positions: ['forward'], clubs: ['Real Sociedad', 'Atlético Madrid', 'Barcelona'], leagues: [LL], debutYear: 2009, won: 'wc lg' },
  { id: 'toni_kroos', name: 'Toni Kroos', nationality: 'Germany', positions: ['midfielder'], clubs: ['Bayern Munich', 'Bayer Leverkusen', 'Real Madrid'], leagues: [BL, LL], debutYear: 2007, lastYear: 2024, won: 'cl wc lg' },
  { id: 'sergio_ramos', name: 'Sergio Ramos', nationality: 'Spain', positions: ['defender'], clubs: ['Sevilla', 'Real Madrid', 'Paris Saint-Germain'], leagues: [LL, L1], debutYear: 2004, won: 'cl wc eu lg' },
  { id: 'karim_benzema', name: 'Karim Benzema', nationality: 'France', positions: ['striker', 'forward'], clubs: ['Lyon', 'Real Madrid', 'Al Ittihad'], leagues: [L1, LL, 'Saudi Pro League'], debutYear: 2004, won: 'cl bd lg' },
  { id: 'zinedine_zidane', name: 'Zinedine Zidane', nationality: 'France', positions: ['midfielder'], clubs: ['Cannes', 'Bordeaux', 'Juventus', 'Real Madrid'], leagues: [L1, SA, LL], debutYear: 1989, lastYear: 2006, won: 'cl bd wc eu lg' },
  { id: 'ronaldinho', name: 'Ronaldinho', nationality: 'Brazil', positions: ['forward', 'winger'], clubs: ['Grêmio', 'Paris Saint-Germain', 'Barcelona', 'AC Milan'], leagues: ['Brazilian Série A', L1, LL, SA], debutYear: 1998, lastYear: 2015, won: 'cl bd wc cp lg' },
  { id: 'ronaldo_nazario', name: 'Ronaldo Nazário', nationality: 'Brazil', positions: ['striker', 'forward'], clubs: ['Cruzeiro', 'PSV', 'Barcelona', 'Inter Milan', 'Real Madrid', 'AC Milan'], leagues: ['Brazilian Série A', 'Eredivisie', LL, SA], debutYear: 1993, lastYear: 2011, won: 'bd wc cp lg' },
  { id: 'thierry_henry', name: 'Thierry Henry', nationality: 'France', positions: ['forward', 'striker'], clubs: ['Monaco', 'Juventus', 'Arsenal', 'Barcelona', 'New York Red Bulls'], leagues: [L1, SA, PL, LL, 'MLS'], debutYear: 1994, lastYear: 2014, won: 'cl wc eu lg' },
  { id: 'steven_gerrard', name: 'Steven Gerrard', nationality: 'England', positions: ['midfielder'], clubs: ['Liverpool', 'LA Galaxy'], leagues: [PL, 'MLS'], debutYear: 1998, lastYear: 2016, won: 'cl' },
  { id: 'frank_lampard', name: 'Frank Lampard', nationality: 'England', positions: ['midfielder'], clubs: ['West Ham United', 'Chelsea', 'Manchester City', 'New York City'], leagues: [PL, 'MLS'], debutYear: 1995, lastYear: 2016, won: 'cl lg' },
  { id: 'andrea_pirlo', name: 'Andrea Pirlo', nationality: 'Italy', positions: ['midfielder'], clubs: ['Brescia', 'Inter Milan', 'AC Milan', 'Juventus', 'New York City'], leagues: [SA, 'MLS'], debutYear: 1995, lastYear: 2017, won: 'cl wc lg' },
  { id: 'paolo_maldini', name: 'Paolo Maldini', nationality: 'Italy', positions: ['defender'], clubs: ['AC Milan'], leagues: [SA], debutYear: 1984, lastYear: 2009, won: 'cl lg' },
  { id: 'xavi', name: 'Xavi', nationality: 'Spain', positions: ['midfielder'], clubs: ['Barcelona', 'Al Sadd'], leagues: [LL, 'Qatar Stars League'], debutYear: 1998, lastYear: 2019, won: 'cl wc eu lg' },
  { id: 'andres_iniesta', name: 'Andrés Iniesta', nationality: 'Spain', positions: ['midfielder'], clubs: ['Barcelona', 'Vissel Kobe'], leagues: [LL, 'J1 League'], debutYear: 2002, lastYear: 2024, won: 'cl wc eu lg' },
  { id: 'diego_maradona', name: 'Diego Maradona', nationality: 'Argentina', positions: ['forward', 'midfielder'], clubs: ['Boca Juniors', 'Barcelona', 'Napoli'], leagues: ['Argentine Primera', LL, SA], debutYear: 1976, lastYear: 1997, won: 'wc lg' },
  { id: 'wayne_rooney', name: 'Wayne Rooney', nationality: 'England', positions: ['forward', 'striker'], clubs: ['Everton', 'Manchester United', 'DC United'], leagues: [PL, 'MLS'], debutYear: 2002, lastYear: 2021, won: 'cl lg' },
  { id: 'didier_drogba', name: 'Didier Drogba', nationality: 'Ivory Coast', positions: ['striker', 'forward'], clubs: ['Marseille', 'Chelsea', 'Galatasaray', 'Montreal Impact'], leagues: [L1, PL, 'Süper Lig', 'MLS'], debutYear: 1998, lastYear: 2018, won: 'cl lg' },
  { id: 'iker_casillas', name: 'Iker Casillas', nationality: 'Spain', positions: ['goalkeeper'], clubs: ['Real Madrid', 'Porto'], leagues: [LL, 'Primeira Liga'], debutYear: 1999, lastYear: 2020, won: 'cl wc eu lg' },
  { id: 'gianluigi_buffon', name: 'Gianluigi Buffon', nationality: 'Italy', positions: ['goalkeeper'], clubs: ['Parma', 'Juventus', 'Paris Saint-Germain'], leagues: [SA, L1], debutYear: 1995, lastYear: 2023, won: 'wc lg' },
  { id: 'manuel_neuer', name: 'Manuel Neuer', nationality: 'Germany', positions: ['goalkeeper'], clubs: ['Schalke 04', 'Bayern Munich'], leagues: [BL], debutYear: 2006, won: 'cl wc lg' },
  { id: 'sergio_aguero', name: 'Sergio Agüero', nationality: 'Argentina', positions: ['striker', 'forward'], clubs: ['Independiente', 'Atlético Madrid', 'Manchester City', 'Barcelona'], leagues: ['Argentine Primera', LL, PL], debutYear: 2003, lastYear: 2021, won: 'cp lg' },
  { id: 'luis_suarez', name: 'Luis Suárez', nationality: 'Uruguay', positions: ['striker', 'forward'], clubs: ['Nacional', 'Ajax', 'Liverpool', 'Barcelona', 'Atlético Madrid', 'Inter Miami'], leagues: ['Eredivisie', PL, LL, 'MLS'], debutYear: 2005, won: 'cl cp lg' },
  { id: 'eden_hazard', name: 'Eden Hazard', nationality: 'Belgium', positions: ['winger', 'forward'], clubs: ['Lille', 'Chelsea', 'Real Madrid'], leagues: [L1, PL, LL], debutYear: 2007, lastYear: 2023, won: 'cl lg' },
  { id: 'ngolo_kante', name: 'N’Golo Kanté', nationality: 'France', positions: ['midfielder'], clubs: ['Caen', 'Leicester City', 'Chelsea', 'Al Ittihad'], leagues: [L1, PL, 'Saudi Pro League'], debutYear: 2012, won: 'cl wc lg' },
  { id: 'riyad_mahrez', name: 'Riyad Mahrez', nationality: 'Algeria', positions: ['winger', 'forward'], clubs: ['Le Havre', 'Leicester City', 'Manchester City', 'Al Ahli'], leagues: [L1, PL, 'Saudi Pro League'], debutYear: 2010, won: 'cl lg' },
  { id: 'son_heung_min', name: 'Son Heung-min', nationality: 'South Korea', positions: ['forward', 'winger'], clubs: ['Hamburger SV', 'Bayer Leverkusen', 'Tottenham Hotspur'], leagues: [BL, PL], debutYear: 2010, won: '' },
];

export const MYSTERY_PLAYERS: MysteryPlayer[] = RAW.map(build);

export function mysteryPlayerById(id: string): MysteryPlayer | undefined {
  return MYSTERY_PLAYERS.find((p) => p.id === id);
}
