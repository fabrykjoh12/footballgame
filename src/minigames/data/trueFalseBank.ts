/**
 * Statements for the True / False rapid-fire mini-game. Pure text facts.
 */

export interface TrueFalseStatement {
  text: string;
  isTrue: boolean;
}

export const TRUE_FALSE_BANK: readonly TrueFalseStatement[] = [
  { text: 'A standard football match lasts 90 minutes of normal time.', isTrue: true },
  { text: 'A goalkeeper may handle the ball anywhere on the pitch.', isTrue: false },
  { text: 'Brazil has won the most men’s FIFA World Cups.', isTrue: true },
  { text: 'The offside rule applies in the attacking half only.', isTrue: true },
  { text: 'A match can be won on penalties during a league fixture.', isTrue: false },
  { text: 'Real Madrid play their home games at the Santiago Bernabéu.', isTrue: true },
  { text: 'A red card means the player is cautioned but stays on.', isTrue: false },
  { text: 'The UEFA Champions League is contested by European clubs.', isTrue: true },
  { text: 'A throw-in is taken with one hand.', isTrue: false },
  { text: 'Each team starts a match with eleven players.', isTrue: true },
  { text: 'A goal scored directly from a corner kick is not allowed.', isTrue: false },
  { text: 'The Premier League is the top tier of English football.', isTrue: true },
  { text: 'A penalty is taken from twelve yards (about 11 metres).', isTrue: true },
  { text: 'Germany has won four men’s World Cup titles.', isTrue: true },
  { text: 'The away goals rule still applies in the Champions League today.', isTrue: false },
  { text: 'Bayern Munich are based in the city of Berlin.', isTrue: false },
  { text: 'A drawn knockout match can go to extra time.', isTrue: true },
  { text: 'Ajax are a Dutch football club.', isTrue: true },
  { text: 'Lionel Messi has played for Paris Saint-Germain.', isTrue: true },
  { text: 'Cristiano Ronaldo has played for Juventus.', isTrue: true },
  { text: 'The FIFA World Cup is held every two years.', isTrue: false },
  { text: 'Spain won the 2010 FIFA World Cup.', isTrue: true },
  { text: 'The Eredivisie is the top division in Portugal.', isTrue: false },
  { text: 'El Clásico is contested by Real Madrid and Barcelona.', isTrue: true },
  { text: 'Serie A is the top football division of Spain.', isTrue: false },
  { text: 'A goalkeeper is allowed to score a goal.', isTrue: true },
  { text: 'The Champions League final is played over two legs.', isTrue: false },
  { text: 'A player shown two yellow cards in a match is sent off.', isTrue: true },
  { text: 'A drawn knockout tie can be decided by a penalty shootout.', isTrue: true },
  { text: 'Manchester City play in the English Premier League.', isTrue: true },
  { text: 'The Ballon d’Or is awarded to the best stadium of the year.', isTrue: false },
];
