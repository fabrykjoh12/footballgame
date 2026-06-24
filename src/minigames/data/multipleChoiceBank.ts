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
];
