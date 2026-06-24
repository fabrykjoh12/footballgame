import { describe, it, expect } from 'vitest';
import {
  matchReducer,
  initialState,
  currentScoreline,
  type MatchState,
  type MatchAction,
} from './matchReducer.ts';
import {
  QUESTIONS_PER_MATCH,
  type AnswerOutcome,
  type MiniGameId,
  type OpponentInfo,
  type PlayerInfo,
} from '../types/match.ts';

// --- fixtures --------------------------------------------------------------

const player: PlayerInfo = {
  id: 'p1',
  displayName: 'Sara',
  side: 'home',
  team: { name: 'Sara FC', primaryRgb: '57 255 122', secondaryRgb: '255 255 255' },
};
const opponent: OpponentInfo = {
  id: 'cpu',
  displayName: 'CPU',
  difficulty: 'pro',
  team: { name: 'Jonas United', primaryRgb: '96 165 250', secondaryRgb: '0 0 0' },
};
const sequence: MiniGameId[] = Array.from(
  { length: QUESTIONS_PER_MATCH },
  () => 'multiple_choice' as MiniGameId,
);

const out = (correct: boolean, quality: number): AnswerOutcome => ({
  correct,
  quality,
  elapsedMs: 1000,
});

function run(state: MatchState, actions: MatchAction[]): MatchState {
  return actions.reduce(matchReducer, state);
}

function started(): MatchState {
  return run(initialState(), [
    { type: 'MENU/SELECT_MODE', mode: 'cpu' },
    { type: 'MATCH/START', mode: 'cpu', player, opponent, sequence },
  ]);
}

/** Play one question with the given outcomes, returning the new state. */
function playQuestion(
  state: MatchState,
  playerOut: AnswerOutcome,
  oppOut: AnswerOutcome,
): MatchState {
  const index = state.results.length;
  return run(state, [
    { type: 'QUESTION/START', index, miniGame: 'multiple_choice', deadline: 0 },
    { type: 'QUESTION/PLAYER_OUTCOME', outcome: playerOut },
    { type: 'QUESTION/OPPONENT_OUTCOME', outcome: oppOut },
    { type: 'QUESTION/REVEAL' },
    { type: 'MATCH/NEXT' },
  ]);
}

// --- tests -----------------------------------------------------------------

describe('match FSM: setup transitions', () => {
  it('starts at the main menu', () => {
    expect(initialState().phase.kind).toBe('main_menu');
  });

  it('SELECT_MODE moves to matchmaking', () => {
    const s = matchReducer(initialState(), {
      type: 'MENU/SELECT_MODE',
      mode: 'online',
    });
    expect(s.phase).toEqual({ kind: 'matchmaking', mode: 'online' });
  });

  it('MATCH/START begins the countdown', () => {
    const s = started();
    expect(s.phase).toMatchObject({ kind: 'countdown', secondsLeft: 3 });
    expect(s.player).toEqual(player);
    expect(s.sequence).toHaveLength(QUESTIONS_PER_MATCH);
  });

  it('rejects a sequence of the wrong length as an illegal transition', () => {
    const s = run(initialState(), [
      { type: 'MENU/SELECT_MODE', mode: 'cpu' },
      { type: 'MATCH/START', mode: 'cpu', player, opponent, sequence: ['true_false'] },
    ]);
    expect(s.phase.kind).toBe('error');
  });

  it('countdown ticks down to zero', () => {
    let s = started();
    s = matchReducer(s, { type: 'MATCH/COUNTDOWN_TICK' });
    expect(s.phase).toMatchObject({ kind: 'countdown', secondsLeft: 2 });
    s = run(s, [
      { type: 'MATCH/COUNTDOWN_TICK' },
      { type: 'MATCH/COUNTDOWN_TICK' },
    ]);
    expect(s.phase).toMatchObject({ kind: 'countdown', secondsLeft: 0 });
  });
});

describe('match FSM: question loop', () => {
  function atFirstQuestion(): MatchState {
    let s = started();
    s = run(s, [
      { type: 'MATCH/COUNTDOWN_TICK' },
      { type: 'MATCH/COUNTDOWN_TICK' },
      { type: 'MATCH/COUNTDOWN_TICK' },
      { type: 'QUESTION/START', index: 0, miniGame: 'multiple_choice', deadline: 0 },
    ]);
    return s;
  }

  it('enters in_question after countdown', () => {
    const s = atFirstQuestion();
    expect(s.phase).toMatchObject({ kind: 'in_question', index: 0 });
  });

  it('ignores a duplicate player outcome', () => {
    let s = atFirstQuestion();
    s = matchReducer(s, { type: 'QUESTION/PLAYER_OUTCOME', outcome: out(true, 1) });
    s = matchReducer(s, { type: 'QUESTION/PLAYER_OUTCOME', outcome: out(false, 0) });
    if (s.phase.kind !== 'in_question') throw new Error('wrong phase');
    expect(s.phase.playerOutcome).toEqual(out(true, 1));
  });

  it('reveals and records a question result', () => {
    let s = atFirstQuestion();
    s = run(s, [
      { type: 'QUESTION/PLAYER_OUTCOME', outcome: out(true, 0.9) },
      { type: 'QUESTION/OPPONENT_OUTCOME', outcome: out(false, 0) },
      { type: 'QUESTION/REVEAL' },
    ]);
    expect(s.phase.kind).toBe('question_reveal');
    expect(s.results).toHaveLength(1);
    expect(s.results[0]?.playerGoals).toBe(1);
  });

  it('treats a missing outcome at forced reveal as a miss', () => {
    let s = atFirstQuestion();
    // Only the opponent answered; reveal is forced (e.g. timeout).
    s = run(s, [
      { type: 'QUESTION/OPPONENT_OUTCOME', outcome: out(true, 1) },
      { type: 'QUESTION/REVEAL' },
    ]);
    expect(s.results[0]?.player.correct).toBe(false);
    expect(s.results[0]?.opponentGoals).toBeGreaterThanOrEqual(1);
  });
});

describe('match FSM: full match', () => {
  it('plays 10 questions and ends with a decisive winner', () => {
    let s = started();
    s = run(s, [
      { type: 'MATCH/COUNTDOWN_TICK' },
      { type: 'MATCH/COUNTDOWN_TICK' },
      { type: 'MATCH/COUNTDOWN_TICK' },
    ]);
    // Player wins every question.
    for (let i = 0; i < QUESTIONS_PER_MATCH; i++) {
      s = playQuestion(s, out(true, 0.9), out(false, 0));
    }
    expect(s.phase.kind).toBe('post_match');
    if (s.phase.kind !== 'post_match') throw new Error('not post_match');
    expect(s.phase.summary.winner).toBe('home');
    expect(s.phase.summary.wentToTiebreaker).toBe(false);
    expect(s.phase.summary.scoreline.home).toBe(QUESTIONS_PER_MATCH);
    expect(s.phase.summary.scoreline.away).toBe(0);
  });

  it('goes to a tiebreaker when scores are level, then resolves it', () => {
    let s = started();
    s = run(s, [
      { type: 'MATCH/COUNTDOWN_TICK' },
      { type: 'MATCH/COUNTDOWN_TICK' },
      { type: 'MATCH/COUNTDOWN_TICK' },
    ]);
    // Both sides score identically every question → level after 10.
    for (let i = 0; i < QUESTIONS_PER_MATCH; i++) {
      s = playQuestion(s, out(true, 0.9), out(true, 0.9));
    }
    expect(s.phase.kind).toBe('tiebreaker');
    expect(currentScoreline(s)).toEqual({ home: 10, away: 10 });

    // Round 1: both correct → still level → round 2.
    s = run(s, [
      { type: 'TIEBREAKER/PLAYER_OUTCOME', outcome: out(true, 1) },
      { type: 'TIEBREAKER/OPPONENT_OUTCOME', outcome: out(true, 1) },
    ]);
    expect(s.phase).toMatchObject({ kind: 'tiebreaker', round: 2 });

    // Round 2: player scores, opponent misses → player wins.
    s = run(s, [
      { type: 'TIEBREAKER/PLAYER_OUTCOME', outcome: out(true, 1) },
      { type: 'TIEBREAKER/OPPONENT_OUTCOME', outcome: out(false, 0) },
    ]);
    expect(s.phase.kind).toBe('post_match');
    if (s.phase.kind !== 'post_match') throw new Error('not post_match');
    expect(s.phase.summary.winner).toBe('home');
    expect(s.phase.summary.wentToTiebreaker).toBe(true);
  });
});

describe('match FSM: resilience', () => {
  it('captures errors into an error phase', () => {
    const s = matchReducer(started(), {
      type: 'MATCH/ERROR',
      code: 'OPPONENT_LEFT',
    });
    expect(s.phase).toMatchObject({ kind: 'error', code: 'OPPONENT_LEFT' });
  });

  it('RESET returns to a clean menu state', () => {
    const s = matchReducer(started(), { type: 'MATCH/RESET' });
    expect(s.phase.kind).toBe('main_menu');
    expect(s.results).toHaveLength(0);
  });

  it('ignores out-of-phase actions (no crash)', () => {
    // REVEAL while at the menu should be a no-op.
    const s = matchReducer(initialState(), { type: 'QUESTION/REVEAL' });
    expect(s.phase.kind).toBe('main_menu');
  });
});
