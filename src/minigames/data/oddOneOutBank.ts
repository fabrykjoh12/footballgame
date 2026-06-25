/**
 * Groups for the Odd One Out mini-game. Each group has three members that
 * share a theme plus one intruder that does not. Pure text — no media.
 */

export interface OddOneOutGroup {
  /** Why the three belong together (shown after the reveal). */
  theme: string;
  members: [string, string, string];
  odd: string;
  /** Short note on why the odd one doesn't fit. */
  reason: string;
}

export const ODD_ONE_OUT_BANK: readonly OddOneOutGroup[] = [
  {
    theme: 'Italian (Serie A) clubs',
    members: ['Juventus', 'Napoli', 'Roma'],
    odd: 'Sevilla',
    reason: 'Sevilla are a Spanish club.',
  },
  {
    theme: 'Spanish (La Liga) clubs',
    members: ['Barcelona', 'Valencia', 'Villarreal'],
    odd: 'Porto',
    reason: 'Porto are a Portuguese club.',
  },
  {
    theme: 'English clubs',
    members: ['Arsenal', 'Everton', 'Newcastle'],
    odd: 'Celtic',
    reason: 'Celtic are a Scottish club.',
  },
  {
    theme: 'German (Bundesliga) clubs',
    members: ['Bayern Munich', 'RB Leipzig', 'Bayer Leverkusen'],
    odd: 'Ajax',
    reason: 'Ajax are a Dutch club.',
  },
  {
    theme: 'Nations that have won the World Cup',
    members: ['Argentina', 'France', 'Uruguay'],
    odd: 'Netherlands',
    reason: 'The Netherlands have never won the World Cup.',
  },
  {
    theme: 'Capital-city clubs',
    members: ['Real Madrid', 'Paris Saint-Germain', 'Roma'],
    odd: 'Manchester City',
    reason: 'Manchester is not a capital city.',
  },
  {
    theme: 'Goalkeeping positions / roles',
    members: ['Goalkeeper', 'Sweeper-keeper', 'Shot-stopper'],
    odd: 'Target man',
    reason: 'A target man is an attacking role.',
  },
  {
    theme: 'European competitions',
    members: ['Champions League', 'Europa League', 'Conference League'],
    odd: 'Copa Libertadores',
    reason: 'The Copa Libertadores is a South American competition.',
  },
];
