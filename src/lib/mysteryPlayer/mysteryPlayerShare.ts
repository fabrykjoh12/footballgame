/**
 * Mystery Player Duel — copy-paste share text (pure).
 */

export interface MysteryShareInput {
  winnerName: string;
  loserName: string;
  solvedPlayerName: string;
  questionsUsed: number;
  wrongGuesses: number;
}

export function buildMysteryShareText(i: MysteryShareInput): string {
  const q = `${i.questionsUsed} question${i.questionsUsed === 1 ? '' : 's'}`;
  return [
    `🕵️ Ball Knowledge — Mystery Player Duel`,
    `${i.winnerName} solved ${i.loserName}’s mystery player in ${q}.`,
    `Mystery player: ${i.solvedPlayerName}` + (i.wrongGuesses ? ` · ${i.wrongGuesses} wrong guess${i.wrongGuesses === 1 ? '' : 'es'}` : ''),
    `Think you know ball? Try to beat it.`,
  ].join('\n');
}
