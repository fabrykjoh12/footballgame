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
  // Extended roster
  'Czech Republic': 'Europe', 'Costa Rica': 'North America', Slovenia: 'Europe',
  Wales: 'Europe', Sweden: 'Europe', Cameroon: 'Africa', Senegal: 'Africa',
  Gabon: 'Africa', Ukraine: 'Europe', Liberia: 'Africa', Bulgaria: 'Europe',
  Colombia: 'South America', Nigeria: 'Africa', Georgia: 'Europe', Morocco: 'Africa',
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

  // ---- Goalkeepers ----
  { id: 'petr_cech', name: 'Petr Čech', nationality: 'Czech Republic', positions: ['goalkeeper'], clubs: ['Rennes', 'Chelsea', 'Arsenal'], leagues: [L1, PL], debutYear: 1999, lastYear: 2019, won: 'cl lg' },
  { id: 'edwin_van_der_sar', name: 'Edwin van der Sar', nationality: 'Netherlands', positions: ['goalkeeper'], clubs: ['Ajax', 'Juventus', 'Fulham', 'Manchester United'], leagues: ['Eredivisie', SA, PL], debutYear: 1990, lastYear: 2011, won: 'cl lg' },
  { id: 'oliver_kahn', name: 'Oliver Kahn', nationality: 'Germany', positions: ['goalkeeper'], clubs: ['Karlsruher SC', 'Bayern Munich'], leagues: [BL], debutYear: 1987, lastYear: 2008, won: 'cl lg' },
  { id: 'thibaut_courtois', name: 'Thibaut Courtois', nationality: 'Belgium', positions: ['goalkeeper'], clubs: ['Genk', 'Atlético Madrid', 'Chelsea', 'Real Madrid'], leagues: ['Belgian Pro League', LL, PL], debutYear: 2009, won: 'cl lg' },
  { id: 'alisson', name: 'Alisson', nationality: 'Brazil', positions: ['goalkeeper'], clubs: ['Internacional', 'Roma', 'Liverpool'], leagues: ['Brazilian Série A', SA, PL], debutYear: 2013, won: 'cl cp lg' },
  { id: 'ederson', name: 'Ederson', nationality: 'Brazil', positions: ['goalkeeper'], clubs: ['Benfica', 'Manchester City'], leagues: ['Primeira Liga', PL], debutYear: 2012, won: 'cl lg' },
  { id: 'gianluigi_donnarumma', name: 'Gianluigi Donnarumma', nationality: 'Italy', positions: ['goalkeeper'], clubs: ['AC Milan', 'Paris Saint-Germain'], leagues: [SA, L1], debutYear: 2015, won: 'eu lg' },
  { id: 'jan_oblak', name: 'Jan Oblak', nationality: 'Slovenia', positions: ['goalkeeper'], clubs: ['Benfica', 'Atlético Madrid'], leagues: ['Primeira Liga', LL], debutYear: 2010, won: 'lg' },
  { id: 'hugo_lloris', name: 'Hugo Lloris', nationality: 'France', positions: ['goalkeeper'], clubs: ['Nice', 'Lyon', 'Tottenham Hotspur', 'LAFC'], leagues: [L1, PL, 'MLS'], debutYear: 2005, won: 'wc' },
  { id: 'wojciech_szczesny', name: 'Wojciech Szczęsny', nationality: 'Poland', positions: ['goalkeeper'], clubs: ['Arsenal', 'Roma', 'Juventus', 'Barcelona'], leagues: [PL, SA, LL], debutYear: 2009, won: 'lg' },

  // ---- Defenders ----
  { id: 'carles_puyol', name: 'Carles Puyol', nationality: 'Spain', positions: ['defender'], clubs: ['Barcelona'], leagues: [LL], debutYear: 1999, lastYear: 2014, won: 'cl wc eu lg' },
  { id: 'gerard_pique', name: 'Gerard Piqué', nationality: 'Spain', positions: ['defender'], clubs: ['Manchester United', 'Barcelona'], leagues: [PL, LL], debutYear: 2004, lastYear: 2023, won: 'cl wc eu lg' },
  { id: 'john_terry', name: 'John Terry', nationality: 'England', positions: ['defender'], clubs: ['Chelsea', 'Aston Villa'], leagues: [PL, 'EFL Championship'], debutYear: 1998, lastYear: 2018, won: 'cl lg' },
  { id: 'rio_ferdinand', name: 'Rio Ferdinand', nationality: 'England', positions: ['defender'], clubs: ['West Ham United', 'Leeds United', 'Manchester United', 'QPR'], leagues: [PL], debutYear: 1996, lastYear: 2015, won: 'cl lg' },
  { id: 'cafu', name: 'Cafu', nationality: 'Brazil', positions: ['defender'], clubs: ['São Paulo', 'Roma', 'AC Milan'], leagues: ['Brazilian Série A', SA], debutYear: 1990, lastYear: 2008, won: 'cl wc cp lg' },
  { id: 'roberto_carlos', name: 'Roberto Carlos', nationality: 'Brazil', positions: ['defender'], clubs: ['Palmeiras', 'Inter Milan', 'Real Madrid'], leagues: ['Brazilian Série A', SA, LL], debutYear: 1992, lastYear: 2015, won: 'cl wc cp lg' },
  { id: 'philipp_lahm', name: 'Philipp Lahm', nationality: 'Germany', positions: ['defender'], clubs: ['Bayern Munich'], leagues: [BL], debutYear: 2002, lastYear: 2017, won: 'cl wc lg' },
  { id: 'fabio_cannavaro', name: 'Fabio Cannavaro', nationality: 'Italy', positions: ['defender'], clubs: ['Napoli', 'Parma', 'Inter Milan', 'Juventus', 'Real Madrid'], leagues: [SA, LL], debutYear: 1992, lastYear: 2011, won: 'bd wc lg' },
  { id: 'marcelo', name: 'Marcelo', nationality: 'Brazil', positions: ['defender'], clubs: ['Fluminense', 'Real Madrid'], leagues: ['Brazilian Série A', LL], debutYear: 2005, won: 'cl lg' },
  { id: 'dani_alves', name: 'Dani Alves', nationality: 'Brazil', positions: ['defender'], clubs: ['Sevilla', 'Barcelona', 'Juventus', 'Paris Saint-Germain'], leagues: [LL, SA, L1], debutYear: 2002, lastYear: 2023, won: 'cl cp lg' },
  { id: 'ashley_cole', name: 'Ashley Cole', nationality: 'England', positions: ['defender'], clubs: ['Arsenal', 'Chelsea', 'Roma', 'LA Galaxy'], leagues: [PL, SA, 'MLS'], debutYear: 1999, lastYear: 2019, won: 'cl lg' },
  { id: 'vincent_kompany', name: 'Vincent Kompany', nationality: 'Belgium', positions: ['defender'], clubs: ['Anderlecht', 'Hamburger SV', 'Manchester City'], leagues: ['Belgian Pro League', BL, PL], debutYear: 2003, lastYear: 2020, won: 'lg' },
  { id: 'thiago_silva', name: 'Thiago Silva', nationality: 'Brazil', positions: ['defender'], clubs: ['Fluminense', 'AC Milan', 'Paris Saint-Germain', 'Chelsea'], leagues: ['Brazilian Série A', SA, L1, PL], debutYear: 2006, won: 'cl cp lg' },
  { id: 'giorgio_chiellini', name: 'Giorgio Chiellini', nationality: 'Italy', positions: ['defender'], clubs: ['Livorno', 'Fiorentina', 'Juventus', 'LAFC'], leagues: [SA, 'MLS'], debutYear: 2000, lastYear: 2023, won: 'eu lg' },
  { id: 'kalidou_koulibaly', name: 'Kalidou Koulibaly', nationality: 'Senegal', positions: ['defender'], clubs: ['Metz', 'Genk', 'Napoli', 'Chelsea', 'Al Hilal'], leagues: [L1, 'Belgian Pro League', SA, PL, 'Saudi Pro League'], debutYear: 2010, won: '' },
  { id: 'achraf_hakimi', name: 'Achraf Hakimi', nationality: 'Morocco', positions: ['defender'], clubs: ['Real Madrid', 'Borussia Dortmund', 'Inter Milan', 'Paris Saint-Germain'], leagues: [LL, BL, SA, L1], debutYear: 2017, won: 'lg' },
  { id: 'trent_alexander_arnold', name: 'Trent Alexander-Arnold', nationality: 'England', positions: ['defender'], clubs: ['Liverpool'], leagues: [PL], debutYear: 2016, won: 'cl lg' },
  { id: 'ruben_dias', name: 'Rúben Dias', nationality: 'Portugal', positions: ['defender'], clubs: ['Benfica', 'Manchester City'], leagues: ['Primeira Liga', PL], debutYear: 2017, won: 'cl lg' },

  // ---- Midfielders ----
  { id: 'paul_pogba', name: 'Paul Pogba', nationality: 'France', positions: ['midfielder'], clubs: ['Manchester United', 'Juventus'], leagues: [PL, SA], debutYear: 2011, won: 'wc lg' },
  { id: 'sergio_busquets', name: 'Sergio Busquets', nationality: 'Spain', positions: ['midfielder'], clubs: ['Barcelona', 'Inter Miami'], leagues: [LL, 'MLS'], debutYear: 2008, won: 'cl wc eu lg' },
  { id: 'ilkay_gundogan', name: 'İlkay Gündoğan', nationality: 'Germany', positions: ['midfielder'], clubs: ['Nürnberg', 'Borussia Dortmund', 'Manchester City', 'Barcelona'], leagues: [BL, PL, LL], debutYear: 2009, won: 'cl lg' },
  { id: 'casemiro', name: 'Casemiro', nationality: 'Brazil', positions: ['midfielder'], clubs: ['São Paulo', 'Real Madrid', 'Manchester United'], leagues: ['Brazilian Série A', LL, PL], debutYear: 2010, won: 'cl cp lg' },
  { id: 'kaka', name: 'Kaká', nationality: 'Brazil', positions: ['midfielder'], clubs: ['São Paulo', 'AC Milan', 'Real Madrid', 'Orlando City'], leagues: ['Brazilian Série A', SA, LL, 'MLS'], debutYear: 2001, lastYear: 2017, won: 'cl bd wc lg' },
  { id: 'michael_ballack', name: 'Michael Ballack', nationality: 'Germany', positions: ['midfielder'], clubs: ['Kaiserslautern', 'Bayer Leverkusen', 'Bayern Munich', 'Chelsea'], leagues: [BL, PL], debutYear: 1995, lastYear: 2012, won: 'lg' },
  { id: 'clarence_seedorf', name: 'Clarence Seedorf', nationality: 'Netherlands', positions: ['midfielder'], clubs: ['Ajax', 'Real Madrid', 'Inter Milan', 'AC Milan'], leagues: ['Eredivisie', LL, SA], debutYear: 1992, lastYear: 2014, won: 'cl lg' },
  { id: 'patrick_vieira', name: 'Patrick Vieira', nationality: 'France', positions: ['midfielder'], clubs: ['Cannes', 'AC Milan', 'Arsenal', 'Juventus', 'Inter Milan', 'Manchester City'], leagues: [SA, PL], debutYear: 1994, lastYear: 2011, won: 'wc eu lg' },
  { id: 'ryan_giggs', name: 'Ryan Giggs', nationality: 'Wales', positions: ['midfielder', 'winger'], clubs: ['Manchester United'], leagues: [PL], debutYear: 1990, lastYear: 2014, won: 'cl lg' },
  { id: 'paul_scholes', name: 'Paul Scholes', nationality: 'England', positions: ['midfielder'], clubs: ['Manchester United'], leagues: [PL], debutYear: 1993, lastYear: 2013, won: 'cl lg' },
  { id: 'david_silva', name: 'David Silva', nationality: 'Spain', positions: ['midfielder'], clubs: ['Valencia', 'Manchester City', 'Real Sociedad'], leagues: [LL, PL], debutYear: 2004, lastYear: 2024, won: 'wc eu lg' },
  { id: 'mesut_ozil', name: 'Mesut Özil', nationality: 'Germany', positions: ['midfielder'], clubs: ['Werder Bremen', 'Real Madrid', 'Arsenal', 'Fenerbahçe'], leagues: [BL, LL, PL, 'Süper Lig'], debutYear: 2006, lastYear: 2023, won: 'wc lg' },
  { id: 'wesley_sneijder', name: 'Wesley Sneijder', nationality: 'Netherlands', positions: ['midfielder'], clubs: ['Ajax', 'Real Madrid', 'Inter Milan', 'Galatasaray'], leagues: ['Eredivisie', LL, SA, 'Süper Lig'], debutYear: 2002, lastYear: 2019, won: 'cl lg' },
  { id: 'joshua_kimmich', name: 'Joshua Kimmich', nationality: 'Germany', positions: ['midfielder', 'defender'], clubs: ['RB Leipzig', 'Bayern Munich'], leagues: [BL], debutYear: 2013, won: 'cl lg' },
  { id: 'federico_valverde', name: 'Federico Valverde', nationality: 'Uruguay', positions: ['midfielder'], clubs: ['Peñarol', 'Real Madrid'], leagues: ['Uruguayan Primera', LL], debutYear: 2016, won: 'cl lg' },
  { id: 'pedri', name: 'Pedri', nationality: 'Spain', positions: ['midfielder'], clubs: ['Las Palmas', 'Barcelona'], leagues: ['EFL Championship', LL], debutYear: 2019, won: 'eu lg' },
  { id: 'jamal_musiala', name: 'Jamal Musiala', nationality: 'Germany', positions: ['midfielder'], clubs: ['Bayern Munich'], leagues: [BL], debutYear: 2020, won: 'lg' },
  { id: 'florian_wirtz', name: 'Florian Wirtz', nationality: 'Germany', positions: ['midfielder'], clubs: ['Bayer Leverkusen'], leagues: [BL], debutYear: 2020, won: 'lg' },
  { id: 'declan_rice', name: 'Declan Rice', nationality: 'England', positions: ['midfielder'], clubs: ['West Ham United', 'Arsenal'], leagues: [PL], debutYear: 2017, won: '' },
  { id: 'nicolo_barella', name: 'Nicolò Barella', nationality: 'Italy', positions: ['midfielder'], clubs: ['Cagliari', 'Inter Milan'], leagues: [SA], debutYear: 2015, won: 'eu lg' },
  { id: 'marco_verratti', name: 'Marco Verratti', nationality: 'Italy', positions: ['midfielder'], clubs: ['Pescara', 'Paris Saint-Germain', 'Al-Arabi'], leagues: [SA, L1, 'Qatar Stars League'], debutYear: 2010, won: 'eu lg' },

  // ---- Wingers & forwards ----
  { id: 'zlatan_ibrahimovic', name: 'Zlatan Ibrahimović', nationality: 'Sweden', positions: ['striker', 'forward'], clubs: ['Ajax', 'Juventus', 'Inter Milan', 'Barcelona', 'AC Milan', 'Paris Saint-Germain', 'Manchester United', 'LA Galaxy'], leagues: ['Eredivisie', SA, LL, L1, PL, 'MLS'], debutYear: 1999, lastYear: 2023, won: 'lg' },
  { id: 'samuel_etoo', name: "Samuel Eto'o", nationality: 'Cameroon', positions: ['striker', 'forward'], clubs: ['Mallorca', 'Barcelona', 'Inter Milan', 'Chelsea'], leagues: [LL, SA, PL], debutYear: 1997, lastYear: 2019, won: 'cl lg' },
  { id: 'david_villa', name: 'David Villa', nationality: 'Spain', positions: ['striker', 'forward'], clubs: ['Sporting Gijón', 'Valencia', 'Barcelona', 'Atlético Madrid', 'New York City'], leagues: [LL, 'MLS'], debutYear: 2000, lastYear: 2019, won: 'cl wc eu lg' },
  { id: 'fernando_torres', name: 'Fernando Torres', nationality: 'Spain', positions: ['striker', 'forward'], clubs: ['Atlético Madrid', 'Liverpool', 'Chelsea', 'AC Milan'], leagues: [LL, PL, SA], debutYear: 2001, lastYear: 2019, won: 'cl wc eu' },
  { id: 'gareth_bale', name: 'Gareth Bale', nationality: 'Wales', positions: ['winger', 'forward'], clubs: ['Southampton', 'Tottenham Hotspur', 'Real Madrid', 'LAFC'], leagues: [PL, LL, 'MLS'], debutYear: 2006, lastYear: 2023, won: 'cl lg' },
  { id: 'edinson_cavani', name: 'Edinson Cavani', nationality: 'Uruguay', positions: ['striker'], clubs: ['Palermo', 'Napoli', 'Paris Saint-Germain', 'Manchester United'], leagues: [SA, L1, PL], debutYear: 2007, won: 'cp lg' },
  { id: 'romelu_lukaku', name: 'Romelu Lukaku', nationality: 'Belgium', positions: ['striker', 'forward'], clubs: ['Anderlecht', 'Chelsea', 'Everton', 'Manchester United', 'Inter Milan', 'Roma', 'Napoli'], leagues: ['Belgian Pro League', PL, SA], debutYear: 2009, won: 'lg' },
  { id: 'sadio_mane', name: 'Sadio Mané', nationality: 'Senegal', positions: ['forward', 'winger'], clubs: ['Red Bull Salzburg', 'Southampton', 'Liverpool', 'Bayern Munich', 'Al Nassr'], leagues: ['Austrian Bundesliga', PL, BL, 'Saudi Pro League'], debutYear: 2011, won: 'cl lg' },
  { id: 'pierre_aubameyang', name: 'Pierre-Emerick Aubameyang', nationality: 'Gabon', positions: ['striker', 'forward'], clubs: ['Saint-Étienne', 'Borussia Dortmund', 'Arsenal', 'Barcelona', 'Marseille'], leagues: [L1, BL, PL, LL], debutYear: 2008, won: '' },
  { id: 'luis_figo', name: 'Luís Figo', nationality: 'Portugal', positions: ['winger', 'midfielder'], clubs: ['Sporting CP', 'Barcelona', 'Real Madrid', 'Inter Milan'], leagues: ['Primeira Liga', LL, SA], debutYear: 1989, lastYear: 2009, won: 'bd lg' },
  { id: 'andriy_shevchenko', name: 'Andriy Shevchenko', nationality: 'Ukraine', positions: ['striker', 'forward'], clubs: ['Dynamo Kyiv', 'AC Milan', 'Chelsea'], leagues: [SA, PL], debutYear: 1994, lastYear: 2012, won: 'cl bd lg' },
  { id: 'raul', name: 'Raúl', nationality: 'Spain', positions: ['striker', 'forward'], clubs: ['Real Madrid', 'Schalke 04'], leagues: [LL, BL], debutYear: 1994, lastYear: 2015, won: 'cl lg' },
  { id: 'del_piero', name: 'Alessandro Del Piero', nationality: 'Italy', positions: ['forward', 'striker'], clubs: ['Padova', 'Juventus', 'Sydney FC'], leagues: [SA, 'A-League'], debutYear: 1991, lastYear: 2014, won: 'cl wc lg' },
  { id: 'francesco_totti', name: 'Francesco Totti', nationality: 'Italy', positions: ['forward', 'midfielder'], clubs: ['Roma'], leagues: [SA], debutYear: 1992, lastYear: 2017, won: 'wc lg' },
  { id: 'george_weah', name: 'George Weah', nationality: 'Liberia', positions: ['striker', 'forward'], clubs: ['Monaco', 'Paris Saint-Germain', 'AC Milan', 'Chelsea'], leagues: [L1, SA, PL], debutYear: 1988, lastYear: 2003, won: 'bd lg' },
  { id: 'hristo_stoichkov', name: 'Hristo Stoichkov', nationality: 'Bulgaria', positions: ['forward', 'striker'], clubs: ['CSKA Sofia', 'Barcelona', 'Parma'], leagues: [LL, SA], debutYear: 1984, lastYear: 2003, won: 'cl bd lg' },
  { id: 'gabriel_batistuta', name: 'Gabriel Batistuta', nationality: 'Argentina', positions: ['striker'], clubs: ['River Plate', 'Boca Juniors', 'Fiorentina', 'Roma', 'Inter Milan'], leagues: ['Argentine Primera', SA], debutYear: 1988, lastYear: 2005, won: 'cp lg' },
  { id: 'carlos_tevez', name: 'Carlos Tevez', nationality: 'Argentina', positions: ['forward', 'striker'], clubs: ['Boca Juniors', 'West Ham United', 'Manchester United', 'Manchester City', 'Juventus'], leagues: ['Argentine Primera', PL, SA], debutYear: 2001, lastYear: 2021, won: 'cl lg' },
  { id: 'radamel_falcao', name: 'Radamel Falcao', nationality: 'Colombia', positions: ['striker'], clubs: ['River Plate', 'Porto', 'Atlético Madrid', 'Monaco', 'Galatasaray'], leagues: ['Primeira Liga', LL, L1, PL, 'Süper Lig'], debutYear: 2005, won: 'lg' },
  { id: 'james_rodriguez', name: 'James Rodríguez', nationality: 'Colombia', positions: ['midfielder', 'forward'], clubs: ['Banfield', 'Porto', 'Monaco', 'Real Madrid', 'Bayern Munich', 'Everton'], leagues: ['Primeira Liga', L1, LL, BL, PL], debutYear: 2008, won: 'lg' },
  { id: 'lautaro_martinez', name: 'Lautaro Martínez', nationality: 'Argentina', positions: ['striker', 'forward'], clubs: ['Racing Club', 'Inter Milan'], leagues: ['Argentine Primera', SA], debutYear: 2015, won: 'wc cp lg' },
  { id: 'julian_alvarez', name: 'Julián Álvarez', nationality: 'Argentina', positions: ['forward', 'striker'], clubs: ['River Plate', 'Manchester City', 'Atlético Madrid'], leagues: ['Argentine Primera', PL, LL], debutYear: 2018, won: 'cl wc cp lg' },
  { id: 'victor_osimhen', name: 'Victor Osimhen', nationality: 'Nigeria', positions: ['striker', 'forward'], clubs: ['Charleroi', 'Lille', 'Napoli'], leagues: ['Belgian Pro League', L1, SA], debutYear: 2017, won: 'lg' },
  { id: 'khvicha_kvaratskhelia', name: 'Khvicha Kvaratskhelia', nationality: 'Georgia', positions: ['winger', 'forward'], clubs: ['Rubin Kazan', 'Napoli', 'Paris Saint-Germain'], leagues: ['Russian Premier League', SA, L1], debutYear: 2017, won: 'lg' },
  { id: 'rafael_leao', name: 'Rafael Leão', nationality: 'Portugal', positions: ['winger', 'forward'], clubs: ['Sporting CP', 'Lille', 'AC Milan'], leagues: ['Primeira Liga', L1, SA], debutYear: 2017, won: 'lg' },
  { id: 'federico_chiesa', name: 'Federico Chiesa', nationality: 'Italy', positions: ['winger', 'forward'], clubs: ['Fiorentina', 'Juventus', 'Liverpool'], leagues: [SA, PL], debutYear: 2016, won: 'eu' },
  { id: 'phil_foden', name: 'Phil Foden', nationality: 'England', positions: ['midfielder', 'winger'], clubs: ['Manchester City'], leagues: [PL], debutYear: 2017, won: 'cl lg' },
  { id: 'cole_palmer', name: 'Cole Palmer', nationality: 'England', positions: ['midfielder', 'forward'], clubs: ['Manchester City', 'Chelsea'], leagues: [PL], debutYear: 2020, won: 'cl lg' },
  { id: 'arjen_robben', name: 'Arjen Robben', nationality: 'Netherlands', positions: ['winger', 'forward'], clubs: ['Groningen', 'PSV', 'Chelsea', 'Real Madrid', 'Bayern Munich'], leagues: ['Eredivisie', PL, LL, BL], debutYear: 2000, lastYear: 2021, won: 'cl lg' },
  { id: 'franck_ribery', name: 'Franck Ribéry', nationality: 'France', positions: ['winger', 'forward'], clubs: ['Marseille', 'Bayern Munich', 'Fiorentina'], leagues: [L1, BL, SA], debutYear: 2004, lastYear: 2022, won: 'cl lg' },
];

export const MYSTERY_PLAYERS: MysteryPlayer[] = RAW.map(build);

export function mysteryPlayerById(id: string): MysteryPlayer | undefined {
  return MYSTERY_PLAYERS.find((p) => p.id === id);
}
