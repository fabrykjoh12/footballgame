/**
 * useMatchEngine — the effects layer around the pure FSM.
 *
 * Owns timers, transport wiring, and question payload generation, translating
 * transport events into reducer actions. The reducer stays pure; this hook is
 * where the messy real world (clocks, subscriptions) is contained. Crucially it
 * never branches gameplay logic on cpu vs online — only the transport differs.
 */

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import {
  HALFTIME_AT,
  initialState,
  matchReducer,
  type MatchState,
} from './matchReducer.ts';
import {
  QUESTIONS_PER_MATCH,
  type AnswerValue,
  type Difficulty,
  type MiniGameId,
} from '../types/match.ts';
import { createRng, seedFromString, type Rng } from '../lib/rng.ts';
import { getMiniGame } from '../minigames/registry.ts';
import { setupCpuMatch, difficultyToSkill } from './setupMatch.ts';
import { createTransport } from '../transport/createTransport.ts';
import { readRuntimeEnv, type MatchTransport } from '../transport/MatchTransport.ts';

const REVEAL_DELAY_MS = 2200;
const BOTH_ANSWERED_PAUSE_MS = 600;
const TIEBREAK_TIME_LIMIT_SEC = 8;
/** How long the half-time interstitial lingers before auto-resuming. */
const HALFTIME_MS = 6000;

interface ActiveQuestion {
  /** Reducer-facing index (0..9) or a synthetic id for tiebreaker rounds. */
  wireIndex: number;
  reducerIndex: number;
  gameId: MiniGameId;
  payload: unknown;
  startedAt: number;
  isTiebreaker: boolean;
}

interface EngineConfig {
  difficulty: Difficulty;
  sequence: MiniGameId[];
  questionRng: Rng;
  transport: MatchTransport;
  skill: number;
}

export interface MatchEngine {
  state: MatchState;
  question: ActiveQuestion | null;
  startCpuMatch: (playerName: string, difficulty: Difficulty) => void;
  selectMode: (mode: 'cpu' | 'online') => void;
  answer: (value: AnswerValue) => void;
  /** Skip the half-time break and kick off the second half immediately. */
  resumeFromHalfTime: () => void;
  reset: () => void;
}

export function useMatchEngine(): MatchEngine {
  const [state, dispatch] = useReducer(matchReducer, undefined, initialState);
  const [question, setQuestion] = useState<ActiveQuestion | null>(null);

  const configRef = useRef<EngineConfig | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  // Tracks which steps already kicked off, so StrictMode double-effects and
  // re-renders never start the same question twice.
  const startedRef = useRef<Set<string>>(new Set());
  const answeredRef = useRef<Set<string>>(new Set());

  // --- transport teardown on unmount ---
  useEffect(() => {
    return () => configRef.current?.transport.disconnect();
  }, []);

  const startQuestion = useCallback((reducerIndex: number) => {
    const cfg = configRef.current;
    if (!cfg) return;
    const key = `q${reducerIndex}`;
    if (startedRef.current.has(key)) return;
    startedRef.current.add(key);

    const gameId = cfg.sequence[reducerIndex] ?? 'multiple_choice';
    const game = getMiniGame(gameId);
    const payload = game.generate(cfg.questionRng, cfg.difficulty);
    const startedAt = Date.now();
    const deadline = startedAt + game.timeLimitSec * 1000;

    setQuestion({
      wireIndex: reducerIndex,
      reducerIndex,
      gameId,
      payload,
      startedAt,
      isTiebreaker: false,
    });
    dispatch({ type: 'QUESTION/START', index: reducerIndex, miniGame: gameId, deadline });
    cfg.transport.send({ t: 'question_open', questionIndex: reducerIndex, deadline });
  }, []);

  const startTiebreakerQuestion = useCallback((round: number) => {
    const cfg = configRef.current;
    if (!cfg) return;
    const key = `t${round}`;
    if (startedRef.current.has(key)) return;
    startedRef.current.add(key);

    const gameId: MiniGameId = 'multiple_choice';
    const game = getMiniGame(gameId);
    const payload = game.generate(cfg.questionRng, cfg.difficulty);
    const startedAt = Date.now();
    const wireIndex = 1000 + round;
    const deadline = startedAt + TIEBREAK_TIME_LIMIT_SEC * 1000;

    setQuestion({
      wireIndex,
      reducerIndex: -1,
      gameId,
      payload,
      startedAt,
      isTiebreaker: true,
    });
    cfg.transport.send({ t: 'question_open', questionIndex: wireIndex, deadline });
  }, []);

  // --- public actions -------------------------------------------------------

  const selectMode = useCallback((mode: 'cpu' | 'online') => {
    dispatch({ type: 'MENU/SELECT_MODE', mode });
  }, []);

  const startCpuMatch = useCallback(
    (playerName: string, difficulty: Difficulty) => {
      configRef.current?.transport.disconnect();
      startedRef.current.clear();
      answeredRef.current.clear();
      setQuestion(null);

      const matchId = `cpu-${seedFromString(playerName)}-${Date.now().toString(36)}-${Math.floor(
        Math.random() * 1e6,
      ).toString(36)}`;
      const setup = setupCpuMatch(playerName, difficulty, matchId);

      const transport = createTransport({
        mode: 'cpu',
        env: readRuntimeEnv(),
        seed: setup.transportSeed,
        cpuOpponent: setup.opponent,
        cpuDifficulty: difficulty,
      });

      const handler = makeOpponentHandler(stateRef, dispatch);
      transport.subscribe(handler);

      configRef.current = {
        difficulty,
        sequence: setup.sequence,
        questionRng: createRng(seedFromString(`${matchId}:q`)),
        transport,
        skill: difficultyToSkill(difficulty),
      };

      dispatch({
        type: 'MATCH/START',
        mode: 'cpu',
        player: setup.player,
        opponent: setup.opponent,
        sequence: setup.sequence,
      });
      transport.send({ t: 'ready', matchId });
    },
    [],
  );

  const answer = useCallback((value: AnswerValue) => {
    const cfg = configRef.current;
    const q = activeQuestionRef.current;
    if (!cfg || !q) return;
    const ansKey = q.isTiebreaker ? `t${q.wireIndex}` : `q${q.wireIndex}`;
    if (answeredRef.current.has(ansKey)) return;
    answeredRef.current.add(ansKey);

    const game = getMiniGame(q.gameId);
    const elapsedMs = Date.now() - q.startedAt;
    const outcome = game.score(q.payload, value, elapsedMs);

    if (q.isTiebreaker) {
      dispatch({ type: 'TIEBREAKER/PLAYER_OUTCOME', outcome });
    } else {
      dispatch({ type: 'QUESTION/PLAYER_OUTCOME', outcome });
    }
    cfg.transport.send({
      t: 'answer',
      questionIndex: q.wireIndex,
      answer: value,
      elapsedMs,
    });
  }, []);

  const resumeFromHalfTime = useCallback(() => {
    if (stateRef.current.phase.kind !== 'half_time') return;
    startQuestion(HALFTIME_AT);
  }, [startQuestion]);

  const reset = useCallback(() => {
    configRef.current?.transport.disconnect();
    configRef.current = null;
    startedRef.current.clear();
    answeredRef.current.clear();
    setQuestion(null);
    dispatch({ type: 'MATCH/RESET' });
  }, []);

  // Keep a ref to the active question for stable callbacks.
  const activeQuestionRef = useRef<ActiveQuestion | null>(null);
  activeQuestionRef.current = question;

  // --- timed orchestration effects -----------------------------------------

  const phase = state.phase;

  // Countdown ticking + kickoff of the first question.
  useEffect(() => {
    if (phase.kind !== 'countdown') return;
    if (phase.secondsLeft > 0) {
      const id = setTimeout(() => dispatch({ type: 'MATCH/COUNTDOWN_TICK' }), 1000);
      return () => clearTimeout(id);
    }
    startQuestion(0);
    return undefined;
  }, [phase.kind, phase.kind === 'countdown' ? phase.secondsLeft : 0, startQuestion]);

  // Auto-reveal once both sides have answered (short dramatic pause).
  useEffect(() => {
    if (phase.kind !== 'in_question') return;
    if (!phase.playerOutcome || !phase.opponentOutcome) return;
    const id = setTimeout(() => dispatch({ type: 'QUESTION/REVEAL' }), BOTH_ANSWERED_PAUSE_MS);
    return () => clearTimeout(id);
  }, [
    phase.kind,
    phase.kind === 'in_question' ? phase.playerOutcome : null,
    phase.kind === 'in_question' ? phase.opponentOutcome : null,
  ]);

  // Deadline: force a reveal if the question runs out of time.
  useEffect(() => {
    if (phase.kind !== 'in_question') return;
    const ms = Math.max(0, phase.deadline - Date.now());
    const id = setTimeout(() => dispatch({ type: 'QUESTION/REVEAL' }), ms);
    return () => clearTimeout(id);
  }, [phase.kind, phase.kind === 'in_question' ? phase.deadline : 0]);

  // After the reveal pause, advance to the next question / half-time /
  // tiebreaker / end.
  useEffect(() => {
    if (phase.kind !== 'question_reveal') return;
    const id = setTimeout(() => {
      const played = stateRef.current.results.length;
      if (played >= QUESTIONS_PER_MATCH) {
        dispatch({ type: 'MATCH/NEXT' });
      } else if (played === HALFTIME_AT) {
        dispatch({ type: 'MATCH/HALF_TIME' });
      } else {
        startQuestion(played);
      }
    }, REVEAL_DELAY_MS);
    return () => clearTimeout(id);
  }, [phase.kind, phase.kind === 'question_reveal' ? phase.index : -1, startQuestion]);

  // Half-time break: auto-resume into the second half after a pause (the
  // player can also skip it manually via resumeFromHalfTime).
  useEffect(() => {
    if (phase.kind !== 'half_time') return;
    const id = setTimeout(() => startQuestion(HALFTIME_AT), HALFTIME_MS);
    return () => clearTimeout(id);
  }, [phase.kind, startQuestion]);

  // Each tiebreaker round opens a fresh sudden-death question.
  useEffect(() => {
    if (phase.kind !== 'tiebreaker') return;
    startTiebreakerQuestion(phase.round);
  }, [phase.kind, phase.kind === 'tiebreaker' ? phase.round : -1, startTiebreakerQuestion]);

  return {
    state,
    question,
    startCpuMatch,
    selectMode,
    answer,
    resumeFromHalfTime,
    reset,
  };
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

type Dispatch = (a: Parameters<typeof matchReducer>[1]) => void;

function makeOpponentHandler(
  stateRef: React.MutableRefObject<MatchState>,
  dispatch: Dispatch,
) {
  return (event: import('../types/realtime.ts').OpponentEvent): void => {
    switch (event.t) {
      case 'opponent_answer': {
        const inTiebreak = stateRef.current.phase.kind === 'tiebreaker';
        dispatch(
          inTiebreak
            ? { type: 'TIEBREAKER/OPPONENT_OUTCOME', outcome: event.outcome }
            : { type: 'QUESTION/OPPONENT_OUTCOME', outcome: event.outcome },
        );
        break;
      }
      case 'opponent_left':
        dispatch({ type: 'MATCH/ERROR', code: 'OPPONENT_LEFT' });
        break;
      case 'opponent_found':
      case 'opponent_ready':
      case 'rematch_offered':
        // No state change needed for the CPU happy path.
        break;
    }
  };
}
