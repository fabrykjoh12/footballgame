/**
 * Question bank for the Multiple Choice mini-game.
 *
 * Pure data — no media, no copyrighted assets. Facts are general European
 * football knowledge. Extend freely; the generator just samples from here.
 */

export interface MultipleChoiceQuestion {
  prompt: string;
  options: [string, string, string, string];
  /** Index into `options` of the correct answer. */
  answerIndex: 0 | 1 | 2 | 3;
}

export const MULTIPLE_CHOICE_BANK: readonly MultipleChoiceQuestion[] = [
  {
    prompt: 'Which country won the UEFA European Championship in 2021 (Euro 2020)?',
    options: ['England', 'Italy', 'Spain', 'France'],
    answerIndex: 1,
  },
  {
    prompt: 'In which city is the home stadium of FC Bayern located?',
    options: ['Berlin', 'Hamburg', 'Munich', 'Dortmund'],
    answerIndex: 2,
  },
  {
    prompt: 'How many players are on the pitch per team at kickoff?',
    options: ['9', '10', '11', '12'],
    answerIndex: 2,
  },
  {
    prompt: 'Which competition is contested by the top clubs across Europe?',
    options: [
      'Copa Libertadores',
      'UEFA Champions League',
      'AFC Champions League',
      'CONCACAF Champions Cup',
    ],
    answerIndex: 1,
  },
  {
    prompt: 'What is the maximum duration of normal time in a football match?',
    options: ['80 minutes', '90 minutes', '100 minutes', '120 minutes'],
    answerIndex: 1,
  },
  {
    prompt: 'Which nation has won the most FIFA World Cup titles?',
    options: ['Germany', 'Italy', 'Argentina', 'Brazil'],
    answerIndex: 3,
  },
  {
    prompt: 'A direct free kick scored straight into the goal counts as…',
    options: ['No goal', 'A valid goal', 'A corner', 'A penalty retake'],
    answerIndex: 1,
  },
  {
    prompt: 'Which English league is the top tier of the football pyramid?',
    options: ['Championship', 'League One', 'Premier League', 'National League'],
    answerIndex: 2,
  },
  {
    prompt: 'How many points is a win worth in most league competitions?',
    options: ['1', '2', '3', '4'],
    answerIndex: 2,
  },
  {
    prompt: 'What shape is shown to send a player off the pitch?',
    options: ['Green card', 'Yellow card', 'Blue card', 'Red card'],
    answerIndex: 3,
  },
  {
    prompt: 'Which Spanish club plays its home games at the Santiago Bernabéu?',
    options: ['Sevilla', 'Real Madrid', 'Valencia', 'Real Betis'],
    answerIndex: 1,
  },
  {
    prompt: 'In a penalty shootout, how far is the spot from the goal line?',
    options: ['9 metres', '11 metres', '13 metres', '16 metres'],
    answerIndex: 1,
  },
  {
    prompt: 'Which club won the 2005 Champions League final in Istanbul?',
    options: ['AC Milan', 'Liverpool', 'Juventus', 'Arsenal'],
    answerIndex: 1,
  },
  {
    prompt: 'Which country won the 2022 FIFA World Cup in Qatar?',
    options: ['France', 'Brazil', 'Argentina', 'Croatia'],
    answerIndex: 2,
  },
  {
    prompt: 'El Clásico is contested between Barcelona and which club?',
    options: ['Atlético Madrid', 'Real Madrid', 'Valencia', 'Sevilla'],
    answerIndex: 1,
  },
  {
    prompt: 'Which English club is nicknamed "The Red Devils"?',
    options: ['Liverpool', 'Arsenal', 'Manchester United', 'Nottingham Forest'],
    answerIndex: 2,
  },
  {
    prompt: 'The Bundesliga is the top football division of which country?',
    options: ['Austria', 'Germany', 'Switzerland', 'Netherlands'],
    answerIndex: 1,
  },
  {
    prompt: 'Ligue 1 is the top division of which country?',
    options: ['Belgium', 'Portugal', 'France', 'Italy'],
    answerIndex: 2,
  },
  {
    prompt: 'The Eredivisie is the top division of which country?',
    options: ['Netherlands', 'Belgium', 'Denmark', 'Norway'],
    answerIndex: 0,
  },
  {
    prompt: 'How many goals does a player need for a hat-trick in one match?',
    options: ['Two', 'Three', 'Four', 'Five'],
    answerIndex: 1,
  },
  {
    prompt: 'What does VAR stand for?',
    options: [
      'Video Assistant Referee',
      'Virtual Action Replay',
      'Verified Assistant Result',
      'Visual Analysis Review',
    ],
    answerIndex: 0,
  },
  {
    prompt: 'A foul by the defending team inside its own box typically results in…',
    options: ['A corner', 'A penalty kick', 'A free kick outside the box', 'A goal kick'],
    answerIndex: 1,
  },
  {
    prompt: 'The Milan derby (Derby della Madonnina) features Inter and which club?',
    options: ['Juventus', 'AC Milan', 'Napoli', 'Roma'],
    answerIndex: 1,
  },
  {
    prompt: 'Which country won the 2024 UEFA European Championship?',
    options: ['England', 'Spain', 'France', 'Germany'],
    answerIndex: 1,
  },
  {
    prompt: 'Which club won the first ever Premier League season (1992–93)?',
    options: ['Blackburn Rovers', 'Manchester United', 'Arsenal', 'Liverpool'],
    answerIndex: 1,
  },
  {
    prompt: 'How long is the standard half-time interval?',
    options: ['10 minutes', '15 minutes', '20 minutes', '5 minutes'],
    answerIndex: 1,
  },
  {
    prompt: 'Which club plays its home games at Anfield?',
    options: ['Everton', 'Liverpool', 'Manchester City', 'Aston Villa'],
    answerIndex: 1,
  },
];
