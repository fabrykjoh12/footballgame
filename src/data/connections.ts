/**
 * "Connections" — name a player who has played for BOTH clubs.
 *
 * Each puzzle carries a generous `accept` list of players who genuinely turned
 * out for both clubs (men's senior football). The first entry is the headline
 * answer shown on the reveal; `aliases` are extra accepted spellings/nicknames
 * that are matched but not displayed. Lists are deliberately curated toward
 * well-known, unambiguous moves so the obvious answer always works.
 *
 * House rules apply: men's football only; no badges/photos anywhere in the UI.
 */

import type { Difficulty } from '../types/game';

export interface Connection {
  id: string;
  clubA: string;
  clubB: string;
  /** Accepted players (canonical display names); shown on the reveal. */
  accept: string[];
  /** Extra accepted spellings/nicknames, matched but not displayed. */
  aliases?: string[];
  difficulty: Difficulty;
  /** Short fact shown on the reveal. */
  note?: string;
}

export const CONNECTIONS: Connection[] = [
  /* ---- easy: several very famous shared players ---- */
  {
    id: 'conn-ars-bar',
    clubA: 'Arsenal',
    clubB: 'Barcelona',
    accept: [
      'Thierry Henry',
      'Marc Overmars',
      'Emmanuel Petit',
      'Alexander Hleb',
      'Cesc Fàbregas',
      'Alex Song',
      'Thomas Vermaelen',
      'Sylvinho',
      'Giovanni van Bronckhorst',
    ],
    aliases: ['Cesc Fabregas', 'Fabregas'],
    difficulty: 'easy',
    note: 'Henry, Overmars and Petit all moved from Highbury to the Camp Nou.',
  },
  {
    id: 'conn-rma-juv',
    clubA: 'Real Madrid',
    clubB: 'Juventus',
    accept: [
      'Cristiano Ronaldo',
      'Zinedine Zidane',
      'Gonzalo Higuaín',
      'Fabio Cannavaro',
      'Emerson',
      'Ángel Di María',
    ],
    aliases: ['Higuain', 'Angel Di Maria', 'Di Maria', 'Zidane'],
    difficulty: 'easy',
    note: 'Zidane went Juventus → Madrid in 2001; Ronaldo did the reverse in 2018.',
  },
  {
    id: 'conn-mun-rma',
    clubA: 'Manchester United',
    clubB: 'Real Madrid',
    accept: [
      'Cristiano Ronaldo',
      'David Beckham',
      'Ángel Di María',
      'Casemiro',
      'Raphaël Varane',
      'Ruud van Nistelrooy',
      'Gabriel Heinze',
    ],
    aliases: ['Raphael Varane', 'Varane', 'Beckham', 'van Nistelrooy'],
    difficulty: 'easy',
    note: 'Beckham and Ronaldo both swapped Old Trafford for the Bernabéu.',
  },
  {
    id: 'conn-int-mil',
    clubA: 'Inter Milan',
    clubB: 'AC Milan',
    accept: [
      'Ronaldo',
      'Zlatan Ibrahimović',
      'Andrea Pirlo',
      'Clarence Seedorf',
      'Christian Vieri',
      'Hernán Crespo',
    ],
    aliases: ['Ibrahimovic', 'Zlatan', 'Pirlo', 'Seedorf', 'Crespo'],
    difficulty: 'easy',
    note: 'Crossing the Milan divide: Ronaldo, Ibrahimović and Pirlo all did it.',
  },
  {
    id: 'conn-psg-bar',
    clubA: 'Paris Saint-Germain',
    clubB: 'Barcelona',
    accept: ['Neymar', 'Lionel Messi', 'Ronaldinho', 'Dani Alves'],
    aliases: ['Messi', 'Dani Alves', 'Daniel Alves'],
    difficulty: 'easy',
    note: 'Neymar made the £200m move the other way in 2017.',
  },
  {
    id: 'conn-liv-bar',
    clubA: 'Liverpool',
    clubB: 'Barcelona',
    accept: ['Luis Suárez', 'Philippe Coutinho', 'Javier Mascherano'],
    aliases: ['Luis Suarez', 'Suarez', 'Coutinho', 'Mascherano'],
    difficulty: 'easy',
    note: 'Suárez and Coutinho both left Anfield for Catalonia.',
  },
  {
    id: 'conn-bay-dor',
    clubA: 'Bayern Munich',
    clubB: 'Borussia Dortmund',
    accept: ['Robert Lewandowski', 'Mario Götze', 'Mats Hummels'],
    aliases: ['Lewandowski', 'Mario Gotze', 'Gotze', 'Hummels'],
    difficulty: 'easy',
    note: 'Lewandowski, Götze and Hummels all crossed German football’s biggest rivalry.',
  },

  /* ---- medium ---- */
  {
    id: 'conn-che-rma',
    clubA: 'Chelsea',
    clubB: 'Real Madrid',
    accept: ['Eden Hazard', 'Thibaut Courtois', 'Claude Makélélé', 'Arjen Robben'],
    aliases: ['Hazard', 'Courtois', 'Makelele', 'Robben'],
    difficulty: 'medium',
    note: 'Makélélé and Hazard both joined Madrid from Stamford Bridge.',
  },
  {
    id: 'conn-bay-rma',
    clubA: 'Bayern Munich',
    clubB: 'Real Madrid',
    accept: ['Toni Kroos', 'Xabi Alonso', 'James Rodríguez', 'Arjen Robben'],
    aliases: ['Kroos', 'Xabi Alonso', 'James Rodriguez', 'James', 'Robben'],
    difficulty: 'medium',
    note: 'Kroos went Bayern → Madrid; Xabi Alonso went the other way.',
  },
  {
    id: 'conn-ars-mun',
    clubA: 'Arsenal',
    clubB: 'Manchester United',
    accept: ['Robin van Persie', 'Alexis Sánchez', 'Henrikh Mkhitaryan', 'Danny Welbeck'],
    aliases: ['van Persie', 'Alexis Sanchez', 'Sanchez', 'Mkhitaryan', 'Welbeck'],
    difficulty: 'medium',
    note: 'Van Persie’s 2012 switch helped United win the title.',
  },
  {
    id: 'conn-tot-rma',
    clubA: 'Tottenham Hotspur',
    clubB: 'Real Madrid',
    accept: ['Gareth Bale', 'Luka Modrić', 'Rafael van der Vaart'],
    aliases: ['Bale', 'Luka Modric', 'Modric', 'van der Vaart'],
    difficulty: 'medium',
    note: 'Bale and Modrić both left Spurs for Madrid and won the Champions League.',
  },
  {
    id: 'conn-eve-mun',
    clubA: 'Everton',
    clubB: 'Manchester United',
    accept: ['Wayne Rooney', 'Romelu Lukaku', 'Marouane Fellaini', 'Phil Neville', 'Tim Howard'],
    aliases: ['Rooney', 'Lukaku', 'Fellaini', 'Howard'],
    difficulty: 'medium',
    note: 'Rooney came through at Everton, starred for United, then went home.',
  },
  {
    id: 'conn-juv-bar',
    clubA: 'Juventus',
    clubB: 'Barcelona',
    accept: ['Zlatan Ibrahimović', 'Dani Alves', 'Miralem Pjanić', 'Arthur'],
    aliases: ['Ibrahimovic', 'Zlatan', 'Dani Alves', 'Pjanic', 'Arthur Melo'],
    difficulty: 'medium',
    note: 'Pjanić and Arthur were swapped between the clubs in 2020.',
  },
  {
    id: 'conn-mci-bar',
    clubA: 'Manchester City',
    clubB: 'Barcelona',
    accept: ['Sergio Agüero', 'Yaya Touré', 'Ferran Torres', 'Eric García'],
    aliases: ['Sergio Aguero', 'Aguero', 'Yaya Toure', 'Toure', 'Ferran Torres', 'Eric Garcia'],
    difficulty: 'medium',
    note: 'Agüero finished his career back at Barcelona in 2021.',
  },
  {
    id: 'conn-che-atm',
    clubA: 'Chelsea',
    clubB: 'Atlético Madrid',
    accept: ['Diego Costa', 'Fernando Torres', 'Filipe Luís', 'Álvaro Morata', 'Thibaut Courtois'],
    aliases: ['Diego Costa', 'Fernando Torres', 'Torres', 'Filipe Luis', 'Alvaro Morata', 'Morata', 'Courtois'],
    difficulty: 'medium',
    note: 'Diego Costa and Filipe Luís both moved between the clubs more than once.',
  },
  {
    id: 'conn-ajx-mil',
    clubA: 'Ajax',
    clubB: 'AC Milan',
    accept: ['Marco van Basten', 'Frank Rijkaard', 'Clarence Seedorf', 'Zlatan Ibrahimović'],
    aliases: ['van Basten', 'Rijkaard', 'Seedorf', 'Ibrahimovic', 'Zlatan'],
    difficulty: 'medium',
    note: 'Van Basten and Rijkaard were part of Milan’s legendary Dutch trio.',
  },
  {
    id: 'conn-liv-mci',
    clubA: 'Liverpool',
    clubB: 'Manchester City',
    accept: ['Raheem Sterling', 'James Milner', 'Craig Bellamy'],
    aliases: ['Sterling', 'Milner', 'Bellamy'],
    difficulty: 'medium',
    note: 'Sterling left Liverpool for City in 2015; Milner did the reverse.',
  },
  {
    id: 'conn-int-mun',
    clubA: 'Inter Milan',
    clubB: 'Manchester United',
    accept: ['Romelu Lukaku', 'Alexis Sánchez', 'Nemanja Vidić', 'Ashley Young'],
    aliases: ['Lukaku', 'Alexis Sanchez', 'Sanchez', 'Vidic', 'Ashley Young'],
    difficulty: 'medium',
    note: 'Lukaku, Sánchez and Young all reunited in Milan after Old Trafford.',
  },

  /* ---- hard ---- */
  {
    id: 'conn-ajx-bar',
    clubA: 'Ajax',
    clubB: 'Barcelona',
    accept: [
      'Johan Cruyff',
      'Frank Rijkaard',
      'Patrick Kluivert',
      'Marc Overmars',
      'Ronald Koeman',
      'Michael Reiziger',
      'Frank de Boer',
    ],
    aliases: ['Cruyff', 'Rijkaard', 'Kluivert', 'Overmars', 'Koeman', 'Reiziger', 'de Boer'],
    difficulty: 'hard',
    note: 'Cruyff defined both clubs — as a player and later as a coach.',
  },
  {
    id: 'conn-psg-rma',
    clubA: 'Paris Saint-Germain',
    clubB: 'Real Madrid',
    accept: ['Kylian Mbappé', 'Ángel Di María', 'Sergio Ramos', 'Keylor Navas'],
    aliases: ['Mbappe', 'Kylian Mbappe', 'Angel Di Maria', 'Di Maria', 'Ramos', 'Navas'],
    difficulty: 'hard',
    note: 'Mbappé finally completed the move to Madrid in 2024.',
  },
  {
    id: 'conn-juv-int',
    clubA: 'Juventus',
    clubB: 'Inter Milan',
    accept: ['Zlatan Ibrahimović', 'Patrick Vieira', 'Andrea Pirlo', 'Roberto Baggio'],
    aliases: ['Ibrahimovic', 'Zlatan', 'Vieira', 'Pirlo', 'Baggio'],
    difficulty: 'hard',
    note: 'A rare and bitter switch: Ibrahimović and Vieira both did it in 2006.',
  },
  {
    id: 'conn-mil-che',
    clubA: 'AC Milan',
    clubB: 'Chelsea',
    accept: ['Andriy Shevchenko', 'Fernando Torres', 'Ruud Gullit'],
    aliases: ['Shevchenko', 'Sheva', 'Fernando Torres', 'Torres', 'Gullit'],
    difficulty: 'hard',
    note: 'Gullit later managed Chelsea as player-manager.',
  },
  {
    id: 'conn-new-liv',
    clubA: 'Newcastle United',
    clubB: 'Liverpool',
    accept: ['Andy Carroll', 'Craig Bellamy', 'Peter Beardsley'],
    aliases: ['Carroll', 'Bellamy', 'Beardsley'],
    difficulty: 'hard',
    note: 'Beardsley starred for both on Tyneside and Merseyside.',
  },
  {
    id: 'conn-mun-juv',
    clubA: 'Manchester United',
    clubB: 'Juventus',
    accept: ['Cristiano Ronaldo', 'Paul Pogba'],
    aliases: ['Ronaldo', 'Pogba'],
    difficulty: 'hard',
    note: 'Pogba went to Juventus on a free, then returned for a world-record fee.',
  },

  /* ---- nightmare: few / trickier answers ---- */
  {
    id: 'conn-ars-juv',
    clubA: 'Arsenal',
    clubB: 'Juventus',
    accept: ['Thierry Henry', 'Patrick Vieira'],
    aliases: ['Henry', 'Vieira'],
    difficulty: 'nightmare',
    note: 'Henry had a short, unhappy spell at Juventus before Arsenal made him a legend.',
  },
  {
    id: 'conn-bar-mun',
    clubA: 'Barcelona',
    clubB: 'Manchester United',
    accept: ['Gerard Piqué', 'Jordi Cruyff', 'Laurent Blanc', 'Mark Hughes'],
    aliases: ['Pique', 'Gerard Pique', 'Jordi Cruyff', 'Laurent Blanc', 'Mark Hughes'],
    difficulty: 'nightmare',
    note: 'Piqué came through United’s academy before becoming a Barça great.',
  },
  {
    id: 'conn-liv-juv',
    clubA: 'Liverpool',
    clubB: 'Juventus',
    accept: ['Ian Rush'],
    aliases: ['Rush'],
    difficulty: 'nightmare',
    note: 'Rush spent a single season in Turin in 1987–88 before returning to Anfield.',
  },
];
