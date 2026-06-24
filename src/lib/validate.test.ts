import { describe, it, expect } from 'vitest';
import { parseOpponentEvent } from './validate.ts';

const team = { name: 'Jonas United', primaryRgb: '96 165 250', secondaryRgb: '255 255 255' };
const opponent = { id: 'cpu-1', displayName: 'CPU', team };

describe('parseOpponentEvent', () => {
  it('rejects non-objects', () => {
    expect(parseOpponentEvent(null)).toBeNull();
    expect(parseOpponentEvent(42)).toBeNull();
    expect(parseOpponentEvent('opponent_ready')).toBeNull();
  });

  it('rejects unknown tags', () => {
    expect(parseOpponentEvent({ t: 'nope' })).toBeNull();
  });

  it('parses simple tagged events', () => {
    expect(parseOpponentEvent({ t: 'opponent_ready' })).toEqual({
      t: 'opponent_ready',
    });
    expect(parseOpponentEvent({ t: 'opponent_left' })).toEqual({
      t: 'opponent_left',
    });
  });

  it('validates opponent_found shape', () => {
    expect(parseOpponentEvent({ t: 'opponent_found', opponent })).toEqual({
      t: 'opponent_found',
      opponent,
    });
    expect(
      parseOpponentEvent({ t: 'opponent_found', opponent: { id: 1 } }),
    ).toBeNull();
  });

  it('validates opponent_answer shape', () => {
    const good = {
      t: 'opponent_answer',
      questionIndex: 3,
      outcome: { correct: true, quality: 0.7, elapsedMs: 1200 },
    };
    expect(parseOpponentEvent(good)).toEqual(good);
    expect(
      parseOpponentEvent({ t: 'opponent_answer', questionIndex: 'x', outcome: {} }),
    ).toBeNull();
  });

  it('rejects an answer with a malformed outcome', () => {
    expect(
      parseOpponentEvent({
        t: 'opponent_answer',
        questionIndex: 1,
        outcome: { correct: 'yes', quality: 1, elapsedMs: 1 },
      }),
    ).toBeNull();
  });
});
