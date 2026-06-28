/**
 * Central player roster — the single source of truth for player facts.
 *
 * Curated, men's-football-only, stable facts only (no live stats). Each entry is
 * a compact `PlayerSeed`; `buildPlayer` derives continent, trophies, aliases and
 * (when omitted) leagues from the club registry. Many modes read from here:
 * Connections (players who played for both clubs), Mystery Player Duel,
 * career-path questions, who-am-I clue seeds.
 *
 * Adding players: use canonical club names from `clubs.ts` (aliases resolve too;
 * a test fails if a club isn't in the registry). `won` tokens: cl bd wc eu cp lg.
 * Provide `leagues` only to override the club-derived default.
 */

import {
  buildPlayer,
  playedForBoth,
  playedForClub,
  byNationality,
  byPosition,
  byLeague,
  byClubCountry,
  activeInYear,
  findById,
  type Player,
  type PlayerRole,
  type PlayerSeed,
} from '../lib/playerDb';

const PL = 'Premier League';
const LL = 'La Liga';
const SA = 'Serie A';
const BL = 'Bundesliga';
const L1 = 'Ligue 1';

const SEED: PlayerSeed[] = [
  // ---- Core modern roster (migrated) ----
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

  // ================= Growth batch 1 — legends & established stars =================

  // ---- Pre-modern icons ----
  { id: 'pele', name: 'Pelé', nationality: 'Brazil', positions: ['forward', 'striker'], clubs: ['Santos', 'New York Cosmos'], debutYear: 1956, lastYear: 1977, won: 'wc lg', aliases: ['Pele', 'Edson Arantes'] },
  { id: 'johan_cruyff', name: 'Johan Cruyff', nationality: 'Netherlands', positions: ['forward', 'midfielder'], clubs: ['Ajax', 'Barcelona', 'Feyenoord'], debutYear: 1964, lastYear: 1984, won: 'cl bd lg', aliases: ['Cruyff', 'Cruijff'] },
  { id: 'franz_beckenbauer', name: 'Franz Beckenbauer', nationality: 'Germany', positions: ['defender', 'midfielder'], clubs: ['Bayern Munich', 'New York Cosmos', 'Hamburger SV'], debutYear: 1964, lastYear: 1983, won: 'cl bd wc eu lg', aliases: ['Beckenbauer', 'Der Kaiser'] },
  { id: 'gerd_muller', name: 'Gerd Müller', nationality: 'Germany', positions: ['striker'], clubs: ['Bayern Munich'], debutYear: 1964, lastYear: 1979, won: 'cl bd wc eu lg', aliases: ['Gerd Muller', 'Muller'] },
  { id: 'alfredo_di_stefano', name: 'Alfredo Di Stéfano', nationality: 'Argentina', positions: ['forward'], clubs: ['River Plate', 'Real Madrid'], debutYear: 1945, lastYear: 1966, won: 'cl bd lg', aliases: ['Di Stefano', 'Di Stéfano'] },
  { id: 'ferenc_puskas', name: 'Ferenc Puskás', nationality: 'Hungary', positions: ['forward', 'striker'], clubs: ['Budapest Honvéd', 'Real Madrid'], debutYear: 1943, lastYear: 1966, won: 'cl lg', aliases: ['Puskas', 'Puskás'] },
  { id: 'eusebio', name: 'Eusébio', nationality: 'Portugal', positions: ['forward', 'striker'], clubs: ['Benfica'], debutYear: 1960, lastYear: 1979, won: 'cl bd lg', aliases: ['Eusebio'] },
  { id: 'george_best', name: 'George Best', nationality: 'Northern Ireland', positions: ['winger', 'forward'], clubs: ['Manchester United', 'LA Galaxy'], debutYear: 1963, lastYear: 1983, won: 'cl bd lg', aliases: ['Best'] },
  { id: 'bobby_charlton', name: 'Bobby Charlton', nationality: 'England', positions: ['midfielder', 'forward'], clubs: ['Manchester United'], debutYear: 1956, lastYear: 1975, won: 'cl bd wc lg', aliases: ['Charlton'] },
  { id: 'bobby_moore', name: 'Bobby Moore', nationality: 'England', positions: ['defender'], clubs: ['West Ham United', 'Fulham'], debutYear: 1958, lastYear: 1977, won: 'wc', aliases: ['Moore'] },
  { id: 'kenny_dalglish', name: 'Kenny Dalglish', nationality: 'Scotland', positions: ['forward'], clubs: ['Celtic', 'Liverpool'], debutYear: 1971, lastYear: 1990, won: 'cl lg', aliases: ['Dalglish', 'King Kenny'] },

  // ---- 80s/90s/00s greats ----
  { id: 'marco_van_basten', name: 'Marco van Basten', nationality: 'Netherlands', positions: ['striker', 'forward'], clubs: ['Ajax', 'AC Milan'], debutYear: 1981, lastYear: 1995, won: 'cl bd eu lg', aliases: ['van Basten'] },
  { id: 'ruud_gullit', name: 'Ruud Gullit', nationality: 'Netherlands', positions: ['midfielder', 'forward'], clubs: ['Feyenoord', 'PSV', 'AC Milan', 'Chelsea'], debutYear: 1979, lastYear: 1998, won: 'cl bd eu lg', aliases: ['Gullit'] },
  { id: 'frank_rijkaard', name: 'Frank Rijkaard', nationality: 'Netherlands', positions: ['midfielder', 'defender'], clubs: ['Ajax', 'AC Milan'], debutYear: 1980, lastYear: 1995, won: 'cl eu lg', aliases: ['Rijkaard'] },
  { id: 'lothar_matthaus', name: 'Lothar Matthäus', nationality: 'Germany', positions: ['midfielder'], clubs: ['Borussia Mönchengladbach', 'Bayern Munich', 'Inter Milan'], debutYear: 1979, lastYear: 2000, won: 'bd wc eu lg', aliases: ['Matthaus', 'Matthäus'] },
  { id: 'roberto_baggio', name: 'Roberto Baggio', nationality: 'Italy', positions: ['forward', 'midfielder'], clubs: ['Fiorentina', 'Juventus', 'AC Milan', 'Inter Milan', 'Brescia'], debutYear: 1985, lastYear: 2004, won: 'bd lg', aliases: ['Baggio', 'Il Divin Codino'] },
  { id: 'romario', name: 'Romário', nationality: 'Brazil', positions: ['striker', 'forward'], clubs: ['Vasco da Gama', 'PSV', 'Barcelona', 'Flamengo'], debutYear: 1985, lastYear: 2007, won: 'wc lg', aliases: ['Romario'] },
  { id: 'rivaldo', name: 'Rivaldo', nationality: 'Brazil', positions: ['forward', 'midfielder'], clubs: ['Deportivo La Coruña', 'Barcelona', 'AC Milan'], debutYear: 1991, lastYear: 2015, won: 'bd wc lg' },
  { id: 'zico', name: 'Zico', nationality: 'Brazil', positions: ['forward', 'midfielder'], clubs: ['Flamengo', 'Udinese'], debutYear: 1971, lastYear: 1994, won: 'lg' },
  { id: 'pavel_nedved', name: 'Pavel Nedvěd', nationality: 'Czech Republic', positions: ['midfielder'], clubs: ['Lazio', 'Juventus'], debutYear: 1992, lastYear: 2009, won: 'bd lg', aliases: ['Nedved', 'Nedvěd'] },
  { id: 'alessandro_nesta', name: 'Alessandro Nesta', nationality: 'Italy', positions: ['defender'], clubs: ['Lazio', 'AC Milan'], debutYear: 1993, lastYear: 2014, won: 'cl wc lg', aliases: ['Nesta'] },
  { id: 'gennaro_gattuso', name: 'Gennaro Gattuso', nationality: 'Italy', positions: ['midfielder'], clubs: ['AC Milan'], debutYear: 1995, lastYear: 2013, won: 'cl wc lg', aliases: ['Gattuso'] },
  { id: 'filippo_inzaghi', name: 'Filippo Inzaghi', nationality: 'Italy', positions: ['striker'], clubs: ['Juventus', 'AC Milan'], debutYear: 1991, lastYear: 2012, won: 'cl wc lg', aliases: ['Inzaghi', 'Pippo Inzaghi'] },
  { id: 'javier_zanetti', name: 'Javier Zanetti', nationality: 'Argentina', positions: ['defender', 'midfielder'], clubs: ['Banfield', 'Inter Milan'], debutYear: 1992, lastYear: 2014, won: 'cl lg', aliases: ['Zanetti'] },
  { id: 'hernan_crespo', name: 'Hernán Crespo', nationality: 'Argentina', positions: ['striker'], clubs: ['River Plate', 'Parma', 'Lazio', 'Inter Milan', 'Chelsea', 'AC Milan'], debutYear: 1993, lastYear: 2012, won: 'lg', aliases: ['Crespo'] },
  { id: 'juan_riquelme', name: 'Juan Román Riquelme', nationality: 'Argentina', positions: ['midfielder'], clubs: ['Boca Juniors', 'Barcelona', 'Villarreal'], debutYear: 1996, lastYear: 2014, won: 'lg', aliases: ['Riquelme'] },
  { id: 'diego_forlan', name: 'Diego Forlán', nationality: 'Uruguay', positions: ['striker', 'forward'], clubs: ['Independiente', 'Manchester United', 'Villarreal', 'Atlético Madrid', 'Inter Milan'], debutYear: 1997, lastYear: 2019, won: '', aliases: ['Forlan', 'Forlán'] },
  { id: 'diego_godin', name: 'Diego Godín', nationality: 'Uruguay', positions: ['defender'], clubs: ['Nacional', 'Villarreal', 'Atlético Madrid', 'Inter Milan'], debutYear: 2003, lastYear: 2023, won: 'lg', aliases: ['Godin', 'Godín'] },

  // ---- English & British modern ----
  { id: 'david_beckham', name: 'David Beckham', nationality: 'England', positions: ['midfielder'], clubs: ['Manchester United', 'Real Madrid', 'LA Galaxy', 'AC Milan', 'Paris Saint-Germain'], debutYear: 1992, lastYear: 2013, won: 'cl lg', aliases: ['Beckham', 'Becks'] },
  { id: 'michael_owen', name: 'Michael Owen', nationality: 'England', positions: ['striker', 'forward'], clubs: ['Liverpool', 'Real Madrid', 'Newcastle United', 'Manchester United'], debutYear: 1996, lastYear: 2013, won: 'bd lg', aliases: ['Owen'] },
  { id: 'alan_shearer', name: 'Alan Shearer', nationality: 'England', positions: ['striker'], clubs: ['Southampton', 'Blackburn Rovers', 'Newcastle United'], debutYear: 1988, lastYear: 2006, won: 'lg', aliases: ['Shearer'] },
  { id: 'roy_keane', name: 'Roy Keane', nationality: 'Republic of Ireland', positions: ['midfielder'], clubs: ['Nottingham Forest', 'Manchester United', 'Celtic'], debutYear: 1990, lastYear: 2006, won: 'cl lg', aliases: ['Keane'] },
  { id: 'gary_lineker', name: 'Gary Lineker', nationality: 'England', positions: ['striker', 'forward'], clubs: ['Leicester City', 'Everton', 'Barcelona', 'Tottenham Hotspur'], debutYear: 1978, lastYear: 1994, won: '', aliases: ['Lineker'] },
  { id: 'raheem_sterling', name: 'Raheem Sterling', nationality: 'England', positions: ['winger', 'forward'], clubs: ['Liverpool', 'Manchester City', 'Chelsea', 'Arsenal'], debutYear: 2012, won: 'lg', aliases: ['Sterling'] },
  { id: 'jack_grealish', name: 'Jack Grealish', nationality: 'England', positions: ['winger', 'midfielder'], clubs: ['Aston Villa', 'Manchester City'], debutYear: 2014, won: 'cl lg', aliases: ['Grealish'] },
  { id: 'marcus_rashford', name: 'Marcus Rashford', nationality: 'England', positions: ['forward', 'winger'], clubs: ['Manchester United', 'Aston Villa'], debutYear: 2015, won: '', aliases: ['Rashford'] },
  { id: 'mason_mount', name: 'Mason Mount', nationality: 'England', positions: ['midfielder'], clubs: ['Chelsea', 'Manchester United'], debutYear: 2017, won: 'cl', aliases: ['Mount'] },

  // ---- Spain / Iberia ----
  { id: 'xabi_alonso', name: 'Xabi Alonso', nationality: 'Spain', positions: ['midfielder'], clubs: ['Real Sociedad', 'Liverpool', 'Real Madrid', 'Bayern Munich'], debutYear: 2000, lastYear: 2017, won: 'cl wc eu lg', aliases: ['Alonso'] },
  { id: 'cesc_fabregas', name: 'Cesc Fàbregas', nationality: 'Spain', positions: ['midfielder'], clubs: ['Arsenal', 'Barcelona', 'Chelsea', 'Monaco'], debutYear: 2003, lastYear: 2023, won: 'wc eu lg', aliases: ['Fabregas', 'Cesc'] },
  { id: 'pep_guardiola', name: 'Pep Guardiola', nationality: 'Spain', positions: ['midfielder'], clubs: ['Barcelona', 'Roma'], debutYear: 1990, lastYear: 2006, won: 'cl lg', aliases: ['Guardiola'] },
  { id: 'alvaro_morata', name: 'Álvaro Morata', nationality: 'Spain', positions: ['striker', 'forward'], clubs: ['Real Madrid', 'Juventus', 'Chelsea', 'Atlético Madrid', 'AC Milan'], debutYear: 2010, won: 'cl eu lg', aliases: ['Morata'] },
  { id: 'marc_ter_stegen', name: 'Marc-André ter Stegen', nationality: 'Germany', positions: ['goalkeeper'], clubs: ['Borussia Mönchengladbach', 'Barcelona'], debutYear: 2011, won: 'cl lg', aliases: ['ter Stegen', 'Ter Stegen'] },
  { id: 'lamine_yamal', name: 'Lamine Yamal', nationality: 'Spain', positions: ['winger', 'forward'], clubs: ['Barcelona'], debutYear: 2023, won: 'eu lg', aliases: ['Yamal'] },
  { id: 'nico_williams', name: 'Nico Williams', nationality: 'Spain', positions: ['winger', 'forward'], clubs: ['Athletic Bilbao'], debutYear: 2021, won: 'eu', aliases: ['Williams'] },
  { id: 'dani_olmo', name: 'Dani Olmo', nationality: 'Spain', positions: ['midfielder', 'forward'], clubs: ['Dinamo Zagreb', 'RB Leipzig', 'Barcelona'], debutYear: 2014, won: 'eu lg', aliases: ['Olmo'] },
  { id: 'gavi', name: 'Gavi', nationality: 'Spain', positions: ['midfielder'], clubs: ['Barcelona'], debutYear: 2021, won: 'lg' },
  { id: 'joao_felix', name: 'João Félix', nationality: 'Portugal', positions: ['forward'], clubs: ['Benfica', 'Atlético Madrid', 'Chelsea', 'Barcelona', 'AC Milan'], debutYear: 2018, won: '', aliases: ['Joao Felix', 'Felix', 'Félix'] },

  // ---- Germany / Netherlands modern ----
  { id: 'thomas_muller', name: 'Thomas Müller', nationality: 'Germany', positions: ['forward', 'midfielder'], clubs: ['Bayern Munich'], debutYear: 2008, won: 'cl wc lg', aliases: ['Thomas Muller', 'Muller', 'Müller'] },
  { id: 'bastian_schweinsteiger', name: 'Bastian Schweinsteiger', nationality: 'Germany', positions: ['midfielder'], clubs: ['Bayern Munich', 'Manchester United'], debutYear: 2002, lastYear: 2019, won: 'cl wc lg', aliases: ['Schweinsteiger', 'Schweini'] },
  { id: 'miroslav_klose', name: 'Miroslav Klose', nationality: 'Germany', positions: ['striker'], clubs: ['Kaiserslautern', 'Werder Bremen', 'Bayern Munich', 'Lazio'], debutYear: 1999, lastYear: 2016, won: 'wc lg', aliases: ['Klose'] },
  { id: 'mario_gotze', name: 'Mario Götze', nationality: 'Germany', positions: ['midfielder', 'forward'], clubs: ['Borussia Dortmund', 'Bayern Munich', 'PSV', 'Eintracht Frankfurt'], debutYear: 2009, won: 'wc lg', aliases: ['Gotze', 'Götze'] },
  { id: 'jerome_boateng', name: 'Jérôme Boateng', nationality: 'Germany', positions: ['defender'], clubs: ['Hamburger SV', 'Manchester City', 'Bayern Munich', 'Lyon'], debutYear: 2007, lastYear: 2023, won: 'cl wc lg', aliases: ['Boateng'] },
  { id: 'mats_hummels', name: 'Mats Hummels', nationality: 'Germany', positions: ['defender'], clubs: ['Bayern Munich', 'Borussia Dortmund', 'Roma'], debutYear: 2008, won: 'wc lg', aliases: ['Hummels'] },
  { id: 'matthijs_de_ligt', name: 'Matthijs de Ligt', nationality: 'Netherlands', positions: ['defender'], clubs: ['Ajax', 'Juventus', 'Bayern Munich', 'Manchester United'], debutYear: 2016, won: 'lg', aliases: ['de Ligt'] },
  { id: 'frenkie_de_jong', name: 'Frenkie de Jong', nationality: 'Netherlands', positions: ['midfielder'], clubs: ['Ajax', 'Barcelona'], debutYear: 2015, won: 'lg', aliases: ['de Jong'] },
  { id: 'dennis_bergkamp', name: 'Dennis Bergkamp', nationality: 'Netherlands', positions: ['forward'], clubs: ['Ajax', 'Inter Milan', 'Arsenal'], debutYear: 1986, lastYear: 2006, won: 'lg', aliases: ['Bergkamp'] },
  { id: 'ruud_van_nistelrooy', name: 'Ruud van Nistelrooy', nationality: 'Netherlands', positions: ['striker'], clubs: ['PSV', 'Manchester United', 'Real Madrid'], debutYear: 1993, lastYear: 2012, won: 'lg', aliases: ['van Nistelrooy'] },
  { id: 'robin_van_persie', name: 'Robin van Persie', nationality: 'Netherlands', positions: ['striker', 'forward'], clubs: ['Feyenoord', 'Arsenal', 'Manchester United', 'Fenerbahçe'], debutYear: 2001, lastYear: 2019, won: 'lg', aliases: ['van Persie'] },
  { id: 'patrick_kluivert', name: 'Patrick Kluivert', nationality: 'Netherlands', positions: ['striker'], clubs: ['Ajax', 'AC Milan', 'Barcelona'], debutYear: 1994, lastYear: 2008, won: 'cl lg', aliases: ['Kluivert'] },

  // ---- France / Italy / others modern ----
  { id: 'didier_deschamps', name: 'Didier Deschamps', nationality: 'France', positions: ['midfielder'], clubs: ['Nantes', 'Marseille', 'Juventus', 'Chelsea'], debutYear: 1985, lastYear: 2001, won: 'cl wc eu lg', aliases: ['Deschamps'] },
  { id: 'ousmane_dembele', name: 'Ousmane Dembélé', nationality: 'France', positions: ['winger', 'forward'], clubs: ['Rennes', 'Borussia Dortmund', 'Barcelona', 'Paris Saint-Germain'], debutYear: 2015, won: 'cl wc lg', aliases: ['Dembele', 'Dembélé'] },
  { id: 'eric_cantona', name: 'Eric Cantona', nationality: 'France', positions: ['forward'], clubs: ['Marseille', 'Leeds United', 'Manchester United'], debutYear: 1983, lastYear: 1997, won: 'lg', aliases: ['Cantona'] },
  { id: 'arturo_vidal', name: 'Arturo Vidal', nationality: 'Chile', positions: ['midfielder'], clubs: ['Bayer Leverkusen', 'Juventus', 'Bayern Munich', 'Barcelona', 'Inter Milan'], debutYear: 2006, won: 'cp lg', aliases: ['Vidal'] },
  { id: 'alexis_sanchez', name: 'Alexis Sánchez', nationality: 'Chile', positions: ['forward', 'winger'], clubs: ['Udinese', 'Barcelona', 'Arsenal', 'Manchester United', 'Inter Milan', 'Marseille'], debutYear: 2005, won: 'cp lg', aliases: ['Sanchez', 'Alexis', 'Sánchez'] },
  { id: 'gabriel_jesus', name: 'Gabriel Jesus', nationality: 'Brazil', positions: ['forward', 'striker'], clubs: ['Palmeiras', 'Manchester City', 'Arsenal'], debutYear: 2015, won: 'cp lg', aliases: ['Jesus'] },
  { id: 'bruno_guimaraes', name: 'Bruno Guimarães', nationality: 'Brazil', positions: ['midfielder'], clubs: ['Lyon', 'Newcastle United'], debutYear: 2017, won: '', aliases: ['Guimaraes', 'Guimarães'] },
  { id: 'darwin_nunez', name: 'Darwin Núñez', nationality: 'Uruguay', positions: ['striker', 'forward'], clubs: ['Benfica', 'Liverpool'], debutYear: 2017, won: '', aliases: ['Nunez', 'Núñez'] },
];

/** The full, built player roster — the single source of truth. */
export const PLAYERS: Player[] = SEED.map(buildPlayer);

/* ------------------------------------------------------------------ */
/* Dataset-bound query API (what modes import)                         */
/* ------------------------------------------------------------------ */

export function playerById(id: string): Player | undefined {
  return findById(PLAYERS, id);
}

/** Players who played for BOTH clubs — the engine behind Connections. */
export function playersForClubPair(clubA: string, clubB: string): Player[] {
  return playedForBoth(PLAYERS, clubA, clubB);
}

export function playersForClub(club: string): Player[] {
  return playedForClub(PLAYERS, club);
}

export function playersByNationality(nationality: string): Player[] {
  return byNationality(PLAYERS, nationality);
}

export function playersByPosition(role: PlayerRole): Player[] {
  return byPosition(PLAYERS, role);
}

export function playersByLeague(league: string): Player[] {
  return byLeague(PLAYERS, league);
}

export function playersByClubCountry(country: string): Player[] {
  return byClubCountry(PLAYERS, country);
}

export function playersActiveInYear(year: number): Player[] {
  return activeInYear(PLAYERS, year);
}
