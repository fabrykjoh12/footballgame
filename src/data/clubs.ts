/**
 * Canonical club registry — the backbone that makes the player database
 * cross-referenceable across game modes.
 *
 * Every club a player references must resolve to ONE canonical name here, so a
 * query like "name a player who played for both Inter and Arsenal" is reliable
 * (it never misses because one entry said "Inter" and another "Inter Milan").
 *
 * Each club carries its country and the league we treat it as playing in (the
 * top flight it's best known for — eras/divisions are not modelled). `aliases`
 * are alternative spellings/short names that resolve to the canonical name.
 *
 * Men's football only; no badges/logos anywhere — names + metadata only.
 */

export interface ClubInfo {
  /** Canonical display name. */
  name: string;
  /** Country the club plays in. */
  country: string;
  /** League we treat the club as belonging to (canonical league name). */
  league: string;
  /** Alternative spellings / short names that resolve to `name`. */
  aliases?: string[];
}

export const CLUBS: ClubInfo[] = [
  /* ---------------- England — Premier League / EFL ---------------- */
  { name: 'Arsenal', country: 'England', league: 'Premier League', aliases: ['Arsenal FC', 'The Gunners'] },
  { name: 'Aston Villa', country: 'England', league: 'Premier League', aliases: ['Villa'] },
  { name: 'Brighton', country: 'England', league: 'Premier League', aliases: ['Brighton & Hove Albion', 'Brighton and Hove Albion'] },
  { name: 'Brentford', country: 'England', league: 'Premier League' },
  { name: 'Chelsea', country: 'England', league: 'Premier League', aliases: ['Chelsea FC', 'The Blues'] },
  { name: 'Crystal Palace', country: 'England', league: 'Premier League', aliases: ['Palace'] },
  { name: 'Everton', country: 'England', league: 'Premier League' },
  { name: 'Fulham', country: 'England', league: 'Premier League' },
  { name: 'Leeds United', country: 'England', league: 'Premier League', aliases: ['Leeds'] },
  { name: 'Leicester City', country: 'England', league: 'Premier League', aliases: ['Leicester', 'The Foxes'] },
  { name: 'Liverpool', country: 'England', league: 'Premier League', aliases: ['Liverpool FC', 'The Reds'] },
  { name: 'Manchester City', country: 'England', league: 'Premier League', aliases: ['Man City', 'Man. City', 'City'] },
  { name: 'Manchester United', country: 'England', league: 'Premier League', aliases: ['Man Utd', 'Man United', 'Manchester Utd', 'United'] },
  { name: 'Newcastle United', country: 'England', league: 'Premier League', aliases: ['Newcastle', 'Newcastle Utd', 'The Magpies'] },
  { name: 'Nottingham Forest', country: 'England', league: 'Premier League', aliases: ['Forest', "Nott'm Forest"] },
  { name: 'Southampton', country: 'England', league: 'Premier League', aliases: ['The Saints'] },
  { name: 'Tottenham Hotspur', country: 'England', league: 'Premier League', aliases: ['Tottenham', 'Spurs'] },
  { name: 'West Ham United', country: 'England', league: 'Premier League', aliases: ['West Ham', 'The Hammers'] },
  { name: 'Wolverhampton Wanderers', country: 'England', league: 'Premier League', aliases: ['Wolves', 'Wolverhampton'] },
  { name: 'Blackburn Rovers', country: 'England', league: 'Premier League', aliases: ['Blackburn'] },
  { name: 'Bolton Wanderers', country: 'England', league: 'Premier League', aliases: ['Bolton'] },
  { name: 'Birmingham City', country: 'England', league: 'EFL Championship', aliases: ['Birmingham'] },
  { name: 'QPR', country: 'England', league: 'EFL Championship', aliases: ['Queens Park Rangers'] },

  /* ---------------- Spain — La Liga ---------------- */
  { name: 'Barcelona', country: 'Spain', league: 'La Liga', aliases: ['FC Barcelona', 'Barça', 'Barca'] },
  { name: 'Real Madrid', country: 'Spain', league: 'La Liga', aliases: ['Real Madrid CF', 'Los Blancos'] },
  { name: 'Atlético Madrid', country: 'Spain', league: 'La Liga', aliases: ['Atletico Madrid', 'Atlético de Madrid', 'Atletico', 'Atléti', 'Atleti'] },
  { name: 'Sevilla', country: 'Spain', league: 'La Liga', aliases: ['Sevilla FC'] },
  { name: 'Valencia', country: 'Spain', league: 'La Liga', aliases: ['Valencia CF'] },
  { name: 'Villarreal', country: 'Spain', league: 'La Liga', aliases: ['Villarreal CF', 'The Yellow Submarine'] },
  { name: 'Real Sociedad', country: 'Spain', league: 'La Liga', aliases: ['La Real', 'Sociedad'] },
  { name: 'Athletic Bilbao', country: 'Spain', league: 'La Liga', aliases: ['Athletic Club'] },
  { name: 'Real Betis', country: 'Spain', league: 'La Liga', aliases: ['Betis'] },
  { name: 'Espanyol', country: 'Spain', league: 'La Liga', aliases: ['RCD Espanyol'] },
  { name: 'Celta Vigo', country: 'Spain', league: 'La Liga', aliases: ['Celta'] },
  { name: 'Getafe', country: 'Spain', league: 'La Liga', aliases: ['Getafe CF'] },
  { name: 'Deportivo La Coruña', country: 'Spain', league: 'La Liga', aliases: ['Deportivo', 'Deportivo de La Coruña', 'Depor'] },
  { name: 'Mallorca', country: 'Spain', league: 'La Liga', aliases: ['RCD Mallorca'] },
  { name: 'Sporting Gijón', country: 'Spain', league: 'La Liga', aliases: ['Sporting Gijon'] },
  { name: 'Las Palmas', country: 'Spain', league: 'La Liga', aliases: ['UD Las Palmas'] },

  /* ---------------- Italy — Serie A ---------------- */
  { name: 'AC Milan', country: 'Italy', league: 'Serie A', aliases: ['Milan', 'A.C. Milan'] },
  { name: 'Inter Milan', country: 'Italy', league: 'Serie A', aliases: ['Inter', 'Internazionale', 'FC Internazionale', 'Inter Milano'] },
  { name: 'Juventus', country: 'Italy', league: 'Serie A', aliases: ['Juve', 'Juventus FC', 'The Old Lady'] },
  { name: 'Roma', country: 'Italy', league: 'Serie A', aliases: ['AS Roma'] },
  { name: 'Lazio', country: 'Italy', league: 'Serie A', aliases: ['SS Lazio'] },
  { name: 'Napoli', country: 'Italy', league: 'Serie A', aliases: ['SSC Napoli'] },
  { name: 'Fiorentina', country: 'Italy', league: 'Serie A', aliases: ['ACF Fiorentina', 'La Viola'] },
  { name: 'Atalanta', country: 'Italy', league: 'Serie A', aliases: ['Atalanta BC'] },
  { name: 'Torino', country: 'Italy', league: 'Serie A', aliases: ['Toro'] },
  { name: 'Sampdoria', country: 'Italy', league: 'Serie A', aliases: ['Samp'] },
  { name: 'Parma', country: 'Italy', league: 'Serie A', aliases: ['Parma Calcio'] },
  { name: 'Udinese', country: 'Italy', league: 'Serie A' },
  { name: 'Cagliari', country: 'Italy', league: 'Serie A' },
  { name: 'Bologna', country: 'Italy', league: 'Serie A' },
  { name: 'Genoa', country: 'Italy', league: 'Serie A', aliases: ['Genoa CFC'] },
  { name: 'Brescia', country: 'Italy', league: 'Serie A' },
  { name: 'Livorno', country: 'Italy', league: 'Serie A' },
  { name: 'Padova', country: 'Italy', league: 'Serie A' },
  { name: 'Pescara', country: 'Italy', league: 'Serie A' },
  { name: 'Palermo', country: 'Italy', league: 'Serie A' },
  { name: 'Novara', country: 'Italy', league: 'Serie A' },

  /* ---------------- Germany — Bundesliga ---------------- */
  { name: 'Bayern Munich', country: 'Germany', league: 'Bundesliga', aliases: ['Bayern', 'FC Bayern', 'FC Bayern Munich', 'Bayern München'] },
  { name: 'Borussia Dortmund', country: 'Germany', league: 'Bundesliga', aliases: ['Dortmund', 'BVB'] },
  { name: 'Bayer Leverkusen', country: 'Germany', league: 'Bundesliga', aliases: ['Leverkusen'] },
  { name: 'RB Leipzig', country: 'Germany', league: 'Bundesliga', aliases: ['Leipzig', 'Red Bull Leipzig'] },
  { name: 'Schalke 04', country: 'Germany', league: 'Bundesliga', aliases: ['Schalke'] },
  { name: 'Werder Bremen', country: 'Germany', league: 'Bundesliga', aliases: ['Bremen'] },
  { name: 'Wolfsburg', country: 'Germany', league: 'Bundesliga', aliases: ['VfL Wolfsburg'] },
  { name: 'Eintracht Frankfurt', country: 'Germany', league: 'Bundesliga', aliases: ['Frankfurt'] },
  { name: 'VfB Stuttgart', country: 'Germany', league: 'Bundesliga', aliases: ['Stuttgart'] },
  { name: 'Borussia Mönchengladbach', country: 'Germany', league: 'Bundesliga', aliases: ['Borussia Monchengladbach', 'Gladbach', "M'gladbach"] },
  { name: 'Hamburger SV', country: 'Germany', league: 'Bundesliga', aliases: ['Hamburg', 'HSV'] },
  { name: 'Kaiserslautern', country: 'Germany', league: 'Bundesliga', aliases: ['1. FC Kaiserslautern'] },
  { name: 'Nürnberg', country: 'Germany', league: 'Bundesliga', aliases: ['Nurnberg', '1. FC Nürnberg'] },
  { name: 'Karlsruher SC', country: 'Germany', league: 'Bundesliga', aliases: ['Karlsruhe'] },

  /* ---------------- France — Ligue 1 ---------------- */
  { name: 'Paris Saint-Germain', country: 'France', league: 'Ligue 1', aliases: ['PSG', 'Paris SG', 'Paris'] },
  { name: 'Marseille', country: 'France', league: 'Ligue 1', aliases: ['Olympique de Marseille', 'OM'] },
  { name: 'Lyon', country: 'France', league: 'Ligue 1', aliases: ['Olympique Lyonnais', 'OL'] },
  { name: 'Monaco', country: 'France', league: 'Ligue 1', aliases: ['AS Monaco'] },
  { name: 'Lille', country: 'France', league: 'Ligue 1', aliases: ['LOSC', 'LOSC Lille'] },
  { name: 'Nice', country: 'France', league: 'Ligue 1', aliases: ['OGC Nice'] },
  { name: 'Rennes', country: 'France', league: 'Ligue 1', aliases: ['Stade Rennais'] },
  { name: 'Lens', country: 'France', league: 'Ligue 1', aliases: ['RC Lens'] },
  { name: 'Bordeaux', country: 'France', league: 'Ligue 1', aliases: ['Girondins de Bordeaux'] },
  { name: 'Saint-Étienne', country: 'France', league: 'Ligue 1', aliases: ['Saint-Etienne', 'ASSE'] },
  { name: 'Nantes', country: 'France', league: 'Ligue 1', aliases: ['FC Nantes'] },
  { name: 'Cannes', country: 'France', league: 'Ligue 1', aliases: ['AS Cannes'] },
  { name: 'Caen', country: 'France', league: 'Ligue 1', aliases: ['SM Caen'] },
  { name: 'Le Havre', country: 'France', league: 'Ligue 1' },
  { name: 'Metz', country: 'France', league: 'Ligue 1', aliases: ['FC Metz'] },

  /* ---------------- Netherlands — Eredivisie ---------------- */
  { name: 'Ajax', country: 'Netherlands', league: 'Eredivisie', aliases: ['AFC Ajax'] },
  { name: 'PSV', country: 'Netherlands', league: 'Eredivisie', aliases: ['PSV Eindhoven'] },
  { name: 'Feyenoord', country: 'Netherlands', league: 'Eredivisie' },
  { name: 'AZ Alkmaar', country: 'Netherlands', league: 'Eredivisie', aliases: ['AZ'] },
  { name: 'Groningen', country: 'Netherlands', league: 'Eredivisie', aliases: ['FC Groningen'] },
  { name: 'Twente', country: 'Netherlands', league: 'Eredivisie', aliases: ['FC Twente'] },

  /* ---------------- Portugal — Primeira Liga ---------------- */
  { name: 'Benfica', country: 'Portugal', league: 'Primeira Liga', aliases: ['SL Benfica'] },
  { name: 'Porto', country: 'Portugal', league: 'Primeira Liga', aliases: ['FC Porto'] },
  { name: 'Sporting CP', country: 'Portugal', league: 'Primeira Liga', aliases: ['Sporting', 'Sporting Lisbon', 'Sporting Lisboa'] },
  { name: 'Braga', country: 'Portugal', league: 'Primeira Liga', aliases: ['SC Braga'] },

  /* ---------------- Belgium / Scotland / Turkey / Greece ---------------- */
  { name: 'Anderlecht', country: 'Belgium', league: 'Belgian Pro League', aliases: ['RSC Anderlecht'] },
  { name: 'Genk', country: 'Belgium', league: 'Belgian Pro League', aliases: ['KRC Genk'] },
  { name: 'Club Brugge', country: 'Belgium', league: 'Belgian Pro League', aliases: ['Brugge', 'Bruges'] },
  { name: 'Charleroi', country: 'Belgium', league: 'Belgian Pro League' },
  { name: 'Celtic', country: 'Scotland', league: 'Scottish Premiership', aliases: ['Celtic FC'] },
  { name: 'Rangers', country: 'Scotland', league: 'Scottish Premiership', aliases: ['Rangers FC'] },
  { name: 'Galatasaray', country: 'Turkey', league: 'Süper Lig' },
  { name: 'Fenerbahçe', country: 'Turkey', league: 'Süper Lig', aliases: ['Fenerbahce'] },
  { name: 'Beşiktaş', country: 'Turkey', league: 'Süper Lig', aliases: ['Besiktas'] },
  { name: 'Trabzonspor', country: 'Turkey', league: 'Süper Lig' },
  { name: 'Olympiacos', country: 'Greece', league: 'Greek Super League', aliases: ['Olympiakos'] },
  { name: 'Panathinaikos', country: 'Greece', league: 'Greek Super League' },

  /* ---------------- Eastern Europe / Russia / Ukraine ---------------- */
  { name: 'Dinamo Zagreb', country: 'Croatia', league: 'Croatian First League', aliases: ['GNK Dinamo Zagreb'] },
  { name: 'Dynamo Kyiv', country: 'Ukraine', league: 'Ukrainian Premier League', aliases: ['Dynamo Kiev'] },
  { name: 'Shakhtar Donetsk', country: 'Ukraine', league: 'Ukrainian Premier League', aliases: ['Shakhtar'] },
  { name: 'Zenit', country: 'Russia', league: 'Russian Premier League', aliases: ['Zenit Saint Petersburg'] },
  { name: 'Spartak Moscow', country: 'Russia', league: 'Russian Premier League' },
  { name: 'CSKA Moscow', country: 'Russia', league: 'Russian Premier League' },
  { name: 'Rubin Kazan', country: 'Russia', league: 'Russian Premier League' },
  { name: 'CSKA Sofia', country: 'Bulgaria', league: 'Bulgarian First League' },
  { name: 'Lech Poznań', country: 'Poland', league: 'Ekstraklasa', aliases: ['Lech Poznan'] },

  /* ---------------- Nordics / Austria / Switzerland ---------------- */
  { name: 'Molde', country: 'Norway', league: 'Eliteserien' },
  { name: 'Bryne', country: 'Norway', league: 'Eliteserien' },
  { name: 'Strømsgodset', country: 'Norway', league: 'Eliteserien', aliases: ['Stromsgodset'] },
  { name: 'Red Bull Salzburg', country: 'Austria', league: 'Austrian Bundesliga', aliases: ['RB Salzburg', 'Salzburg', 'FC Salzburg'] },
  { name: 'Basel', country: 'Switzerland', league: 'Swiss Super League', aliases: ['FC Basel'] },

  /* ---------------- Brazil — Série A ---------------- */
  { name: 'Flamengo', country: 'Brazil', league: 'Brazilian Série A' },
  { name: 'Palmeiras', country: 'Brazil', league: 'Brazilian Série A' },
  { name: 'Santos', country: 'Brazil', league: 'Brazilian Série A', aliases: ['Santos FC'] },
  { name: 'São Paulo', country: 'Brazil', league: 'Brazilian Série A', aliases: ['Sao Paulo'] },
  { name: 'Corinthians', country: 'Brazil', league: 'Brazilian Série A' },
  { name: 'Fluminense', country: 'Brazil', league: 'Brazilian Série A' },
  { name: 'Grêmio', country: 'Brazil', league: 'Brazilian Série A', aliases: ['Gremio'] },
  { name: 'Internacional', country: 'Brazil', league: 'Brazilian Série A', aliases: ['Inter Porto Alegre', 'SC Internacional'] },
  { name: 'Cruzeiro', country: 'Brazil', league: 'Brazilian Série A' },
  { name: 'Vasco da Gama', country: 'Brazil', league: 'Brazilian Série A', aliases: ['Vasco'] },

  /* ---------------- Argentina / Uruguay / South America ---------------- */
  { name: 'Boca Juniors', country: 'Argentina', league: 'Argentine Primera', aliases: ['Boca'] },
  { name: 'River Plate', country: 'Argentina', league: 'Argentine Primera', aliases: ['River'] },
  { name: 'Independiente', country: 'Argentina', league: 'Argentine Primera' },
  { name: 'Racing Club', country: 'Argentina', league: 'Argentine Primera', aliases: ['Racing'] },
  { name: 'Banfield', country: 'Argentina', league: 'Argentine Primera' },
  { name: 'Newell\'s Old Boys', country: 'Argentina', league: 'Argentine Primera', aliases: ["Newells Old Boys", "Newell's"] },
  { name: 'Estudiantes', country: 'Argentina', league: 'Argentine Primera' },
  { name: 'Nacional', country: 'Uruguay', league: 'Uruguayan Primera' },
  { name: 'Peñarol', country: 'Uruguay', league: 'Uruguayan Primera', aliases: ['Penarol'] },
  { name: 'Atlético Nacional', country: 'Colombia', league: 'Categoría Primera A', aliases: ['Atletico Nacional'] },

  /* ---------------- North America (MLS) ---------------- */
  { name: 'Inter Miami', country: 'United States', league: 'MLS', aliases: ['Inter Miami CF'] },
  { name: 'LA Galaxy', country: 'United States', league: 'MLS' },
  { name: 'LAFC', country: 'United States', league: 'MLS', aliases: ['Los Angeles FC'] },
  { name: 'New York City', country: 'United States', league: 'MLS', aliases: ['New York City FC', 'NYCFC'] },
  { name: 'New York Red Bulls', country: 'United States', league: 'MLS' },
  { name: 'Orlando City', country: 'United States', league: 'MLS' },
  { name: 'DC United', country: 'United States', league: 'MLS', aliases: ['D.C. United'] },
  { name: 'Montreal Impact', country: 'Canada', league: 'MLS', aliases: ['CF Montréal', 'CF Montreal'] },

  /* ---------------- Middle East / Asia / Oceania ---------------- */
  { name: 'Al Nassr', country: 'Saudi Arabia', league: 'Saudi Pro League', aliases: ['Al-Nassr'] },
  { name: 'Al Hilal', country: 'Saudi Arabia', league: 'Saudi Pro League', aliases: ['Al-Hilal'] },
  { name: 'Al Ittihad', country: 'Saudi Arabia', league: 'Saudi Pro League', aliases: ['Al-Ittihad'] },
  { name: 'Al Ahli', country: 'Saudi Arabia', league: 'Saudi Pro League', aliases: ['Al-Ahli'] },
  { name: 'Al Sadd', country: 'Qatar', league: 'Qatar Stars League', aliases: ['Al-Sadd'] },
  { name: 'Al-Arabi', country: 'Qatar', league: 'Qatar Stars League', aliases: ['Al Arabi'] },
  { name: 'Vissel Kobe', country: 'Japan', league: 'J1 League' },
  { name: 'Sydney FC', country: 'Australia', league: 'A-League' },

  /* ---------------- Historic / misc (for legends) ---------------- */
  { name: 'New York Cosmos', country: 'United States', league: 'NASL', aliases: ['Cosmos'] },
  { name: 'Nancy', country: 'France', league: 'Ligue 1', aliases: ['AS Nancy'] },
  { name: 'Budapest Honvéd', country: 'Hungary', league: 'Nemzeti Bajnokság I', aliases: ['Honvéd', 'Honved', 'Budapest Honved'] },
];

/* ------------------------------------------------------------------ */
/* Resolution helpers                                                  */
/* ------------------------------------------------------------------ */

const BY_CANONICAL = new Map<string, ClubInfo>(CLUBS.map((c) => [c.name, c]));

const ALIAS_TO_CANONICAL = new Map<string, string>();
for (const c of CLUBS) {
  ALIAS_TO_CANONICAL.set(c.name.toLowerCase(), c.name);
  for (const a of c.aliases ?? []) ALIAS_TO_CANONICAL.set(a.toLowerCase(), c.name);
}

/** Resolve any known spelling/alias to its canonical club name (else input). */
export function canonicalClub(name: string): string {
  return ALIAS_TO_CANONICAL.get(name.trim().toLowerCase()) ?? name.trim();
}

/** True if `name` is exactly a canonical club name in the registry. */
export function isCanonicalClub(name: string): boolean {
  return BY_CANONICAL.has(name);
}

/** True if `name` resolves to a club in the registry (canonical or alias). */
export function isKnownClub(name: string): boolean {
  return ALIAS_TO_CANONICAL.has(name.trim().toLowerCase());
}

/** Look up a club's metadata by any known spelling. */
export function clubInfo(name: string): ClubInfo | undefined {
  return BY_CANONICAL.get(canonicalClub(name));
}

/** The league a club plays in, or undefined if unknown. */
export function leagueForClub(name: string): string | undefined {
  return clubInfo(name)?.league;
}

/** The country a club plays in, or undefined if unknown. */
export function countryForClub(name: string): string | undefined {
  return clubInfo(name)?.country;
}

/** All canonical club names. */
export const CANONICAL_CLUBS: string[] = CLUBS.map((c) => c.name);
