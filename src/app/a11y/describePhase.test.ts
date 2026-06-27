import { describe, it, expect } from 'vitest';
import { describePhase } from './describePhase.ts';
import { initialState, type MatchState } from '../../engine/matchReducer.ts';
import type {
  OpponentInfo,
  PlayerInfo,
  QuestionResult,
} from '../../types/match.ts';

const player: PlayerInfo = {
  id: 'p',
  displayName: 'Sara',
  side: 'home',
  team: { name: 'Sara FC', primaryRgb: '57 255 122', secondaryRgb: '0 0 0' },
};
const opponent: OpponentInfo = {
  id: 'o',
  displayName: 'CPU',
  team: { name: 'Jonas United', primaryRgb: '96 165 250', secondaryRgb: '0 0 0' },
};

const goal = (i: number): QuestionResult => ({
  index: i,
  miniGame: 'multiple_choice',
  player: { correct: true, quality: 1, elapsedMs: 500 },
  opponent: { correct: false, quality: 0, elapsedMs: 500 },
  playerGoals: 1,
  opponentGoals: 0,
});

function withPhase(phase: MatchState['phase'], extra: Partial<MatchState> = {}): MatchState {
  return { ...initialState(), player, opponent, phase, ...extra };
}

describe('describePhase', () => {
  it('describes the menu', () => {
    expect(describePhase(initialState())).toMatch(/menu/i);
  });

  it('counts down then kicks off', () => {
    expect(describePhase(withPhase({ kind: 'countdown', secondsLeft: 2 }))).toContain('2');
    expect(describePhase(withPhase({ kind: 'countdown', secondsLeft: 0 }))).toMatch(/kick off/i);
  });

  it('announces the question number (1-based)', () => {
    const s = withPhase({
      kind: 'in_question',
      index: 2,
      miniGame: 'multiple_choice',
      deadline: 0,
      playerOutcome: null,
      opponentOutcome: null,
    });
    expect(describePhase(s)).toMatch(/question 3 of 10/i);
  });

  it('announces a goal on reveal', () => {
    const s = withPhase({ kind: 'question_reveal', index: 0, result: goal(0) });
    expect(describePhase(s)).toMatch(/goal/i);
  });

  it('reports the half-time score', () => {
    const s = withPhase(
      { kind: 'half_time', scoreline: { home: 3, away: 1 } },
      { results: [goal(0), goal(1), goal(2)] },
    );
    const out = describePhase(s);
    expect(out).toMatch(/half time/i);
    expect(out).toContain('Sara FC 3');
  });

  it('reports the full-time result from the player perspective', () => {
    const s = withPhase({
      kind: 'post_match',
      summary: {
        scoreline: { home: 4, away: 2 },
        winner: 'home',
        results: [],
        wentToTiebreaker: false,
        player,
        opponent,
      },
    });
    const out = describePhase(s);
    expect(out).toMatch(/full time/i);
    expect(out).toMatch(/you win/i);
  });

  it('never leaves an empty announcement for known phases', () => {
    expect(describePhase(withPhase({ kind: 'tiebreaker', round: 2, playerOutcome: null, opponentOutcome: null }))).not.toBe('');
    expect(describePhase(withPhase({ kind: 'error', code: 'OPPONENT_LEFT', recoverable: true }))).not.toBe('');
  });
});
