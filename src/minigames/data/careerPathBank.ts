/**
 * Career paths for the Career Path mini-game. A simplified, approximate
 * sequence of clubs (no dates, no media) used to identify the player from a
 * small set of options. Kept generic and uncontroversial.
 */

export interface CareerPath {
  player: string;
  /** Ordered club sequence (earlier → later). */
  clubs: string[];
}

export const CAREER_PATH_BANK: readonly CareerPath[] = [
  { player: 'Zlatan Ibrahimović', clubs: ['Ajax', 'Juventus', 'Inter', 'Barcelona', 'AC Milan'] },
  { player: 'Andrea Pirlo', clubs: ['Brescia', 'Inter', 'AC Milan', 'Juventus'] },
  { player: 'Thierry Henry', clubs: ['Monaco', 'Juventus', 'Arsenal', 'Barcelona'] },
  { player: 'Luís Figo', clubs: ['Sporting CP', 'Barcelona', 'Real Madrid', 'Inter'] },
  { player: 'Carlos Tévez', clubs: ['Boca Juniors', 'West Ham', 'Manchester United', 'Manchester City', 'Juventus'] },
  { player: 'David Beckham', clubs: ['Manchester United', 'Real Madrid', 'LA Galaxy', 'AC Milan', 'PSG'] },
  { player: 'Ashley Cole', clubs: ['Arsenal', 'Chelsea', 'Roma', 'LA Galaxy'] },
  { player: 'Gareth Bale', clubs: ['Southampton', 'Tottenham', 'Real Madrid'] },
  { player: 'Cesc Fàbregas', clubs: ['Barcelona', 'Arsenal', 'Chelsea', 'Monaco'] },
  { player: 'Samuel Eto’o', clubs: ['Real Madrid', 'Mallorca', 'Barcelona', 'Inter', 'Chelsea'] },
  { player: 'Robin van Persie', clubs: ['Feyenoord', 'Arsenal', 'Manchester United', 'Fenerbahçe'] },
  { player: 'Xabi Alonso', clubs: ['Real Sociedad', 'Liverpool', 'Real Madrid', 'Bayern Munich'] },
];
