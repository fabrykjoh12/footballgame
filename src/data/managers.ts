/**
 * Managers dataset — for the "Manager Merry-go-round" mode (name a manager who
 * managed BOTH clubs). Curated, men's football only; clubs use canonical names
 * from the club registry (aliases resolve too). Only the clubs needed to make
 * recognisable pairs are listed — not every short caretaker spell.
 */

import { canonicalClub } from './clubs';

export interface ManagerSeed {
  id: string;
  name: string;
  nationality: string;
  /** Notable clubs managed (canonicalised on build). */
  clubs: string[];
  /** Extra accepted spellings/surnames beyond the auto surname. */
  aliases?: string[];
}

export interface Manager {
  id: string;
  name: string;
  nationality: string;
  clubs: string[];
  aliases: string[];
}

const SEED: ManagerSeed[] = [
  { id: 'pep_guardiola', name: 'Pep Guardiola', nationality: 'Spain', clubs: ['Barcelona', 'Bayern Munich', 'Manchester City'], aliases: ['Guardiola'] },
  { id: 'jose_mourinho', name: 'José Mourinho', nationality: 'Portugal', clubs: ['Porto', 'Chelsea', 'Inter Milan', 'Real Madrid', 'Manchester United', 'Tottenham Hotspur', 'Roma'], aliases: ['Mourinho'] },
  { id: 'carlo_ancelotti', name: 'Carlo Ancelotti', nationality: 'Italy', clubs: ['AC Milan', 'Chelsea', 'Paris Saint-Germain', 'Real Madrid', 'Bayern Munich', 'Napoli', 'Everton', 'Juventus'], aliases: ['Ancelotti'] },
  { id: 'jurgen_klopp', name: 'Jürgen Klopp', nationality: 'Germany', clubs: ['Borussia Dortmund', 'Liverpool'], aliases: ['Klopp'] },
  { id: 'arsene_wenger', name: 'Arsène Wenger', nationality: 'France', clubs: ['Monaco', 'Arsenal'], aliases: ['Wenger'] },
  { id: 'alex_ferguson', name: 'Alex Ferguson', nationality: 'Scotland', clubs: ['Manchester United'], aliases: ['Ferguson', 'Sir Alex'] },
  { id: 'antonio_conte', name: 'Antonio Conte', nationality: 'Italy', clubs: ['Juventus', 'Chelsea', 'Inter Milan', 'Tottenham Hotspur', 'Napoli'], aliases: ['Conte'] },
  { id: 'massimiliano_allegri', name: 'Massimiliano Allegri', nationality: 'Italy', clubs: ['AC Milan', 'Juventus'], aliases: ['Allegri'] },
  { id: 'diego_simeone', name: 'Diego Simeone', nationality: 'Argentina', clubs: ['Atlético Madrid', 'River Plate', 'Racing Club', 'Estudiantes'], aliases: ['Simeone', 'Cholo'] },
  { id: 'mauricio_pochettino', name: 'Mauricio Pochettino', nationality: 'Argentina', clubs: ['Espanyol', 'Southampton', 'Tottenham Hotspur', 'Paris Saint-Germain', 'Chelsea'], aliases: ['Pochettino', 'Poch'] },
  { id: 'luis_enrique', name: 'Luis Enrique', nationality: 'Spain', clubs: ['Celta Vigo', 'Roma', 'Barcelona', 'Paris Saint-Germain'], aliases: ['Lucho'] },
  { id: 'louis_van_gaal', name: 'Louis van Gaal', nationality: 'Netherlands', clubs: ['Ajax', 'Barcelona', 'Bayern Munich', 'Manchester United'], aliases: ['van Gaal'] },
  { id: 'rafael_benitez', name: 'Rafael Benítez', nationality: 'Spain', clubs: ['Valencia', 'Liverpool', 'Inter Milan', 'Chelsea', 'Napoli', 'Real Madrid', 'Newcastle United', 'Everton'], aliases: ['Benitez', 'Rafa'] },
  { id: 'roberto_mancini', name: 'Roberto Mancini', nationality: 'Italy', clubs: ['Fiorentina', 'Lazio', 'Inter Milan', 'Manchester City', 'Galatasaray', 'Zenit'], aliases: ['Mancini'] },
  { id: 'marcelo_bielsa', name: 'Marcelo Bielsa', nationality: 'Argentina', clubs: ['Athletic Bilbao', 'Marseille', 'Lazio', 'Leeds United'], aliases: ['Bielsa', 'El Loco'] },
  { id: 'unai_emery', name: 'Unai Emery', nationality: 'Spain', clubs: ['Valencia', 'Sevilla', 'Paris Saint-Germain', 'Arsenal', 'Villarreal', 'Aston Villa'], aliases: ['Emery'] },
  { id: 'thomas_tuchel', name: 'Thomas Tuchel', nationality: 'Germany', clubs: ['Borussia Dortmund', 'Paris Saint-Germain', 'Chelsea', 'Bayern Munich'], aliases: ['Tuchel'] },
  { id: 'erik_ten_hag', name: 'Erik ten Hag', nationality: 'Netherlands', clubs: ['Ajax', 'Manchester United'], aliases: ['ten Hag'] },
  { id: 'fabio_capello', name: 'Fabio Capello', nationality: 'Italy', clubs: ['AC Milan', 'Real Madrid', 'Roma', 'Juventus'], aliases: ['Capello'] },
  { id: 'marcello_lippi', name: 'Marcello Lippi', nationality: 'Italy', clubs: ['Napoli', 'Juventus', 'Inter Milan'], aliases: ['Lippi'] },
  { id: 'giovanni_trapattoni', name: 'Giovanni Trapattoni', nationality: 'Italy', clubs: ['Juventus', 'Inter Milan', 'Bayern Munich', 'Fiorentina', 'Benfica'], aliases: ['Trapattoni', 'Trap'] },
  { id: 'manuel_pellegrini', name: 'Manuel Pellegrini', nationality: 'Chile', clubs: ['Villarreal', 'Real Madrid', 'Manchester City', 'Real Betis', 'West Ham United'], aliases: ['Pellegrini'] },
  { id: 'claudio_ranieri', name: 'Claudio Ranieri', nationality: 'Italy', clubs: ['Valencia', 'Atlético Madrid', 'Chelsea', 'Juventus', 'Roma', 'Inter Milan', 'Monaco', 'Leicester City', 'Napoli', 'Fulham'], aliases: ['Ranieri'] },
  { id: 'brendan_rodgers', name: 'Brendan Rodgers', nationality: 'Northern Ireland', clubs: ['Liverpool', 'Celtic', 'Leicester City'], aliases: ['Rodgers'] },
  { id: 'david_moyes', name: 'David Moyes', nationality: 'Scotland', clubs: ['Everton', 'Manchester United', 'Real Sociedad', 'West Ham United'], aliases: ['Moyes'] },
  { id: 'jupp_heynckes', name: 'Jupp Heynckes', nationality: 'Germany', clubs: ['Borussia Mönchengladbach', 'Bayern Munich', 'Real Madrid', 'Bayer Leverkusen', 'Schalke 04', 'Eintracht Frankfurt'], aliases: ['Heynckes'] },
  { id: 'ottmar_hitzfeld', name: 'Ottmar Hitzfeld', nationality: 'Germany', clubs: ['Borussia Dortmund', 'Bayern Munich'], aliases: ['Hitzfeld'] },
  { id: 'ernesto_valverde', name: 'Ernesto Valverde', nationality: 'Spain', clubs: ['Athletic Bilbao', 'Valencia', 'Espanyol', 'Olympiacos', 'Barcelona'], aliases: ['Valverde', 'Txingurri'] },
  { id: 'hansi_flick', name: 'Hansi Flick', nationality: 'Germany', clubs: ['Bayern Munich', 'Barcelona'], aliases: ['Flick'] },
  { id: 'julian_nagelsmann', name: 'Julian Nagelsmann', nationality: 'Germany', clubs: ['Hoffenheim', 'RB Leipzig', 'Bayern Munich'], aliases: ['Nagelsmann'] },
  { id: 'maurizio_sarri', name: 'Maurizio Sarri', nationality: 'Italy', clubs: ['Napoli', 'Chelsea', 'Juventus', 'Lazio'], aliases: ['Sarri'] },
  { id: 'bobby_robson', name: 'Bobby Robson', nationality: 'England', clubs: ['PSV', 'Sporting CP', 'Porto', 'Barcelona', 'Newcastle United', 'Fulham'], aliases: ['Robson'] },
  { id: 'sven_goran_eriksson', name: 'Sven-Göran Eriksson', nationality: 'Sweden', clubs: ['Benfica', 'Roma', 'Fiorentina', 'Sampdoria', 'Lazio', 'Manchester City'], aliases: ['Eriksson', 'Sven'] },
  { id: 'frank_rijkaard_mgr', name: 'Frank Rijkaard', nationality: 'Netherlands', clubs: ['Barcelona', 'Galatasaray'], aliases: ['Rijkaard'] },
  { id: 'zinedine_zidane_mgr', name: 'Zinedine Zidane', nationality: 'France', clubs: ['Real Madrid'], aliases: ['Zidane', 'Zizou'] },
  { id: 'xabi_alonso_mgr', name: 'Xabi Alonso', nationality: 'Spain', clubs: ['Bayer Leverkusen', 'Real Madrid'], aliases: ['Alonso'] },
  { id: 'gennaro_gattuso_mgr', name: 'Gennaro Gattuso', nationality: 'Italy', clubs: ['AC Milan', 'Napoli', 'Valencia', 'Fiorentina', 'Marseille'], aliases: ['Gattuso'] },
  { id: 'andrea_pirlo_mgr', name: 'Andrea Pirlo', nationality: 'Italy', clubs: ['Juventus'], aliases: ['Pirlo'] },
  { id: 'patrick_vieira_mgr', name: 'Patrick Vieira', nationality: 'France', clubs: ['Crystal Palace'], aliases: ['Vieira'] },
  { id: 'frank_lampard_mgr', name: 'Frank Lampard', nationality: 'England', clubs: ['Chelsea', 'Everton'], aliases: ['Lampard'] },
  { id: 'steven_gerrard_mgr', name: 'Steven Gerrard', nationality: 'England', clubs: ['Rangers', 'Aston Villa'], aliases: ['Gerrard'] },
  { id: 'mikel_arteta', name: 'Mikel Arteta', nationality: 'Spain', clubs: ['Arsenal'], aliases: ['Arteta'] },
  { id: 'vicente_del_bosque', name: 'Vicente del Bosque', nationality: 'Spain', clubs: ['Real Madrid'], aliases: ['del Bosque'] },
  { id: 'roberto_di_matteo', name: 'Roberto Di Matteo', nationality: 'Italy', clubs: ['Chelsea', 'Schalke 04', 'Aston Villa'], aliases: ['Di Matteo'] },
];

export const MANAGERS: Manager[] = SEED.map((s) => ({
  id: s.id,
  name: s.name,
  nationality: s.nationality,
  clubs: s.clubs.map(canonicalClub),
  aliases: s.aliases ?? [],
}));
