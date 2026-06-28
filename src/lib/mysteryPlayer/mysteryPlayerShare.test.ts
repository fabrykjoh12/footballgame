import { describe, it, expect } from 'vitest';
import { buildMysteryShareText } from './mysteryPlayerShare';

describe('buildMysteryShareText', () => {
  it('summarises a solved duel', () => {
    const t = buildMysteryShareText({
      winnerName: 'Sara FC',
      loserName: 'Jonas United',
      solvedPlayerName: 'Kevin De Bruyne',
      questionsUsed: 6,
      wrongGuesses: 0,
    });
    expect(t).toContain('Mystery Player Duel');
    expect(t).toContain('Sara FC solved Jonas United’s mystery player in 6 questions.');
    expect(t).toContain('Kevin De Bruyne');
    expect(t).not.toContain('wrong guess');
  });

  it('notes wrong guesses when there were any', () => {
    const t = buildMysteryShareText({
      winnerName: 'Sara FC',
      loserName: 'Jonas United',
      solvedPlayerName: 'Kevin De Bruyne',
      questionsUsed: 1,
      wrongGuesses: 2,
    });
    expect(t).toContain('1 question');
    expect(t).toContain('2 wrong guesses');
  });
});
