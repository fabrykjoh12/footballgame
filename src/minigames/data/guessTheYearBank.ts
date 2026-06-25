/**
 * Events for the Guess the Year mini-game. Pure text + a year. Years are
 * well-known football milestones; the game rewards closeness, not just exactness.
 */

export interface YearEvent {
  prompt: string;
  year: number;
}

export const GUESS_THE_YEAR_BANK: readonly YearEvent[] = [
  { prompt: 'England won the men’s FIFA World Cup on home soil.', year: 1966 },
  { prompt: 'The first UEFA Champions League era began (rebrand from European Cup).', year: 1992 },
  { prompt: 'The Premier League played its first season.', year: 1992 },
  { prompt: 'Spain won three major men’s tournaments in a row, starting with the Euros.', year: 2008 },
  { prompt: 'Leicester City won the Premier League title against the odds.', year: 2016 },
  { prompt: 'Germany won the men’s World Cup in Brazil.', year: 2014 },
  { prompt: 'France won the men’s World Cup in Russia.', year: 2018 },
  { prompt: 'Argentina won the men’s World Cup in Qatar.', year: 2022 },
  { prompt: 'The Bosman ruling reshaped player transfers in Europe.', year: 1995 },
  { prompt: 'Italy won the men’s World Cup in Germany.', year: 2006 },
  { prompt: 'Greece won the UEFA European Championship.', year: 2004 },
  { prompt: 'Manchester United completed the historic treble.', year: 1999 },
  { prompt: 'Portugal won their first UEFA European Championship.', year: 2016 },
  { prompt: 'Liverpool won the Champions League final in Istanbul.', year: 2005 },
];

/** Inclusive year range the slider/stepper allows. */
export const YEAR_MIN = 1950;
export const YEAR_MAX = 2025;
