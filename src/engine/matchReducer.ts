/**
 * The match finite state machine — a pure reducer.
 *
 * This is the spine the entire game hangs off. Offline (CPU) and online play
 * share this exact code path; they differ only in which transport supplies the
 * opponent's events. No side effects live here — timers, transport sends, and
 * subscriptions are the hook's job (useMatchEngine). That keeps the FSM
 * testable without React.
 */

import {
  MatchError,
  QUESTIONS_PER_MATCH,
  type AnswerOutcome,
  type GameMode,
  type MiniGameId,
  type OpponentInfo,
  type PlayerInfo,
  type QuestionResult,
  type Scoreline,
} from '../types/match.ts';
import {
  buildSummary,
  isLevel,
  resolveQuestion,
  tallyScoreline,
} from './scoring.ts';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export type MatchPhase =
  | { kind: 'main_menu' }
  | { kind: 'matchmaking'; mode: GameMode }
  | { kind: 'countdown'; secondsLeft: number }
  | {
      kind: 'in_question';
      index: number;
      miniGame: MiniGameId;
      /** Absolute epoch-ms deadline; survives tab backgrounding. */
      deadline: number;
      /** Outcomes received so far this question. */
      playerOutcome: AnswerOutcome | null;
      opponentOutcome: AnswerOutcome | null;
    }
  | { kind: 'question_reveal'; index: number; result: QuestionResult }
  | {
      kind: 'tiebreaker';
      round: number;
      playerOutcome: AnswerOutcome | null;
      opponentOutcome: AnswerOutcome | null;
    }
  | { kind: 'post_match'; summary: ReturnType<typeof buildSummary> }
  | { kind: 'error'; code: MatchError['code']; recoverable: boolean };

export interface MatchState {
  phase: MatchPhase;
  mode: GameMode;
  player: PlayerInfo | null;
  opponent: OpponentInfo | null;
  /** The pre-drawn sequence of mini-games, length QUESTIONS_PER_MATCH. */
  sequence: MiniGameId[];
  results: QuestionResult[];
  wentToTiebreaker: boolean;
}

export function initialState(): MatchState {
  return {
    phase: { kind: 'main_menu' },
    mode: 'cpu',
    player: null,
    opponent: null,
    sequence: [],
    results: [],
    wentToTiebreaker: false,
  };
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export type MatchAction =
  | { type: 'MENU/SELECT_MODE'; mode: GameMode }
  | {
      type: 'MATCH/START';
      mode: GameMode;
      player: PlayerInfo;
      opponent: OpponentInfo;
      sequence: MiniGameId[];
    }
  | { type: 'MATCH/COUNTDOWN_TICK' }
  | { type: 'QUESTION/START'; index: number; miniGame: MiniGameId; deadline: number }
  | { type: 'QUESTION/PLAYER_OUTCOME'; outcome: AnswerOutcome }
  | { type: 'QUESTION/OPPONENT_OUTCOME'; outcome: AnswerOutcome }
  | { type: 'QUESTION/REVEAL' }
  | { type: 'MATCH/NEXT' }
  | { type: 'TIEBREAKER/PLAYER_OUTCOME'; outcome: AnswerOutcome }
  | { type: 'TIEBREAKER/OPPONENT_OUTCOME'; outcome: AnswerOutcome }
  | { type: 'MATCH/ERROR'; code: MatchError['code']; recoverable?: boolean }
  | { type: 'MATCH/RESET' };

const COUNTDOWN_FROM = 3;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Current scoreline from the player's perspective baked into home/away. */
export function currentScoreline(state: MatchState): Scoreline {
  const side = state.player?.side ?? 'home';
  return tallyScoreline(state.results, side);
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

export function matchReducer(
  state: MatchState,
  action: MatchAction,
): MatchState {
  switch (action.type) {
    case 'MATCH/RESET':
      return { ...initialState(), mode: state.mode };

    case 'MATCH/ERROR':
      return {
        ...state,
        phase: {
          kind: 'error',
          code: action.code,
          recoverable: action.recoverable ?? true,
        },
      };

    case 'MENU/SELECT_MODE':
      if (state.phase.kind !== 'main_menu') return state;
      return {
        ...state,
        mode: action.mode,
        phase: { kind: 'matchmaking', mode: action.mode },
      };

    case 'MATCH/START': {
      // Allowed from matchmaking (fresh match) or post_match (rematch).
      if (
        state.phase.kind !== 'matchmaking' &&
        state.phase.kind !== 'main_menu'
      ) {
        return state;
      }
      if (action.sequence.length !== QUESTIONS_PER_MATCH) {
        return errorState(state, 'ILLEGAL_TRANSITION');
      }
      return {
        ...state,
        mode: action.mode,
        player: action.player,
        opponent: action.opponent,
        sequence: action.sequence,
        results: [],
        wentToTiebreaker: false,
        phase: { kind: 'countdown', secondsLeft: COUNTDOWN_FROM },
      };
    }

    case 'MATCH/COUNTDOWN_TICK': {
      if (state.phase.kind !== 'countdown') return state;
      const left = state.phase.secondsLeft - 1;
      if (left > 0) {
        return { ...state, phase: { kind: 'countdown', secondsLeft: left } };
      }
      // Countdown done — engine will dispatch QUESTION/START next.
      return { ...state, phase: { kind: 'countdown', secondsLeft: 0 } };
    }

    case 'QUESTION/START': {
      // Legal from countdown(0), or from question_reveal via MATCH/NEXT path.
      const ok =
        (state.phase.kind === 'countdown' && state.phase.secondsLeft === 0) ||
        state.phase.kind === 'question_reveal';
      if (!ok) return state;
      if (action.index !== state.results.length) {
        return errorState(state, 'ILLEGAL_TRANSITION');
      }
      return {
        ...state,
        phase: {
          kind: 'in_question',
          index: action.index,
          miniGame: action.miniGame,
          deadline: action.deadline,
          playerOutcome: null,
          opponentOutcome: null,
        },
      };
    }

    case 'QUESTION/PLAYER_OUTCOME':
    case 'QUESTION/OPPONENT_OUTCOME': {
      if (state.phase.kind !== 'in_question') return state;
      const isPlayer = action.type === 'QUESTION/PLAYER_OUTCOME';
      const playerOutcome = isPlayer
        ? action.outcome
        : state.phase.playerOutcome;
      const opponentOutcome = isPlayer
        ? state.phase.opponentOutcome
        : action.outcome;
      // Ignore duplicate outcomes for the same participant.
      if (isPlayer && state.phase.playerOutcome) return state;
      if (!isPlayer && state.phase.opponentOutcome) return state;
      return {
        ...state,
        phase: { ...state.phase, playerOutcome, opponentOutcome },
      };
    }

    case 'QUESTION/REVEAL': {
      if (state.phase.kind !== 'in_question') return state;
      const { playerOutcome, opponentOutcome, index, miniGame } = state.phase;
      if (!playerOutcome || !opponentOutcome) {
        // Reveal forced (e.g. timeout) with a missing outcome → treat as wrong.
        const filled = (o: AnswerOutcome | null): AnswerOutcome =>
          o ?? { correct: false, quality: 0, elapsedMs: 0 };
        const result = resolveQuestion(
          index,
          miniGame,
          filled(playerOutcome),
          filled(opponentOutcome),
        );
        return {
          ...state,
          results: [...state.results, result],
          phase: { kind: 'question_reveal', index, result },
        };
      }
      const result = resolveQuestion(
        index,
        miniGame,
        playerOutcome,
        opponentOutcome,
      );
      return {
        ...state,
        results: [...state.results, result],
        phase: { kind: 'question_reveal', index, result },
      };
    }

    case 'MATCH/NEXT': {
      if (state.phase.kind !== 'question_reveal') return state;
      const played = state.results.length;
      if (played < QUESTIONS_PER_MATCH) {
        // Engine will follow with QUESTION/START for the next index.
        return state;
      }
      // All questions played — decide outcome.
      const score = currentScoreline(state);
      if (isLevel(score)) {
        return {
          ...state,
          wentToTiebreaker: true,
          phase: {
            kind: 'tiebreaker',
            round: 1,
            playerOutcome: null,
            opponentOutcome: null,
          },
        };
      }
      return finishMatch(state);
    }

    case 'TIEBREAKER/PLAYER_OUTCOME':
    case 'TIEBREAKER/OPPONENT_OUTCOME': {
      if (state.phase.kind !== 'tiebreaker') return state;
      // Sudden death: store as a synthetic question result and re-evaluate.
      // The engine pairs player+opponent outcomes per round and dispatches both;
      // we resolve when this round has produced a decisive edge.
      return applyTiebreakerOutcome(state, action);
    }

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Tiebreaker handling (sudden death)
// ---------------------------------------------------------------------------

/**
 * Sudden-death tiebreaker. Each round both sides answer one rapid question.
 * Pending outcomes are buffered in the phase itself (no side channels). When
 * both are in: if exactly one side scored, they win; otherwise advance to the
 * next round with a clean buffer.
 */
function applyTiebreakerOutcome(
  state: MatchState,
  action:
    | { type: 'TIEBREAKER/PLAYER_OUTCOME'; outcome: AnswerOutcome }
    | { type: 'TIEBREAKER/OPPONENT_OUTCOME'; outcome: AnswerOutcome },
): MatchState {
  if (state.phase.kind !== 'tiebreaker') return state;

  const isPlayer = action.type === 'TIEBREAKER/PLAYER_OUTCOME';
  // Ignore duplicate outcomes for the same participant this round.
  if (isPlayer && state.phase.playerOutcome) return state;
  if (!isPlayer && state.phase.opponentOutcome) return state;

  const player = isPlayer ? action.outcome : state.phase.playerOutcome;
  const opponent = isPlayer ? state.phase.opponentOutcome : action.outcome;

  if (!player || !opponent) {
    return {
      ...state,
      phase: {
        ...state.phase,
        playerOutcome: player,
        opponentOutcome: opponent,
      },
    };
  }

  if (player.correct !== opponent.correct) {
    // Decisive round — append as a final result and finish.
    const result = resolveQuestion(
      state.results.length,
      state.sequence[state.sequence.length - 1] ?? 'true_false',
      { ...player, quality: player.correct ? 1 : 0 },
      { ...opponent, quality: opponent.correct ? 1 : 0 },
    );
    return finishMatch({ ...state, results: [...state.results, result] });
  }

  // Still level — next sudden-death round with a clean buffer.
  return {
    ...state,
    phase: {
      kind: 'tiebreaker',
      round: state.phase.round + 1,
      playerOutcome: null,
      opponentOutcome: null,
    },
  };
}

function finishMatch(state: MatchState): MatchState {
  if (!state.player || !state.opponent) {
    return errorState(state, 'ILLEGAL_TRANSITION');
  }
  const summary = buildSummary(
    state.results,
    state.player,
    state.opponent,
    state.wentToTiebreaker,
  );
  return { ...state, phase: { kind: 'post_match', summary } };
}

function errorState(
  state: MatchState,
  code: MatchError['code'],
): MatchState {
  return { ...state, phase: { kind: 'error', code, recoverable: false } };
}
