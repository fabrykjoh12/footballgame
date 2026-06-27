import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MatchEngine } from './matchEngine';
import type { GameEvent, Player, Question, Room } from '../types/game';

function player(id: string, isHost = false): Player {
  return {
    id,
    name: id,
    isHost,
    connected: true,
    score: 0,
    goals: 0,
    correctAnswers: 0,
    streak: 0,
    bestStreak: 0,
    fastestAnswerMs: null,
  };
}

function q(id: string): Question {
  return {
    id,
    type: 'club_country',
    difficulty: 'easy',
    category: 'clubs',
    prompt: '?',
    options: ['a', 'b', 'c', 'd'],
    correctAnswer: 'a',
    explanation: '',
  };
}

function makeRoom(): Room {
  return {
    roomCode: 'BK1',
    hostId: 'h',
    players: [player('h', true), player('g')],
    settings: { mode: 'casual', questionCount: 2, questionDurationMs: 10000 },
    currentQuestionIndex: 0,
    selectedQuestions: [],
    answers: {},
    scores: { h: 0, g: 0 },
    status: 'lobby',
    questionStartedAt: null,
    lastResult: null,
    createdAt: 0,
  };
}

function harness() {
  let room = makeRoom();
  const events: GameEvent[] = [];
  const engine = new MatchEngine(room, {
    onRoom: (r) => {
      room = r;
    },
    onEvent: (e) => events.push(e),
  });
  return {
    engine,
    events,
    get room() {
      return room;
    },
    find(id: string) {
      return room.players.find((p) => p.id === id)!;
    },
  };
}

describe('MatchEngine', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('runs the lifecycle and scores exactly', () => {
    const h = harness();
    h.engine.beginMatch([q('q1'), q('q2')]);
    expect(h.room.status).toBe('starting');

    vi.advanceTimersByTime(1500); // kickoff
    expect(h.room.status).toBe('in_question');
    expect(h.room.currentQuestionIndex).toBe(0);

    // Host correct (fast), guest wrong.
    h.engine.recordAnswer('h', { selectedAnswer: 'a', clueStage: 0, timeTakenMs: 1000 });
    h.engine.recordAnswer('g', { selectedAnswer: 'b', clueStage: 0, timeTakenMs: 1000 });
    vi.advanceTimersByTime(700); // all-answered reveal
    expect(h.room.status).toBe('showing_result');
    // base 700 + speed round(300 * 9000/10000)=270, streak 1 -> 970
    expect(h.find('h').score).toBe(970);
    expect(h.find('h').correctAnswers).toBe(1);
    expect(h.find('g').score).toBe(0);
    expect(h.find('g').streak).toBe(0);

    h.engine.nextQuestion();
    expect(h.room.status).toBe('in_question');
    expect(h.room.currentQuestionIndex).toBe(1);

    h.engine.recordAnswer('h', { selectedAnswer: 'a', clueStage: 0, timeTakenMs: 1000 });
    h.engine.recordAnswer('g', { selectedAnswer: 'a', clueStage: 0, timeTakenMs: 1000 });
    vi.advanceTimersByTime(700);
    // host streak 2 -> base 700 + 270 + 50 = 1020 => 1990 total
    expect(h.find('h').score).toBe(1990);
    expect(h.find('g').score).toBe(970);

    h.engine.nextQuestion(); // last question -> finish
    expect(h.room.status).toBe('finished');
    expect(h.find('h').correctAnswers).toBe(2);
    expect(h.find('h').bestStreak).toBe(2);
    expect(h.find('h').fastestAnswerMs).toBe(1000);
  });

  it('auto-reveals on timeout when nobody answers', () => {
    const h = harness();
    h.engine.beginMatch([q('q1')]);
    vi.advanceTimersByTime(1500);
    expect(h.room.status).toBe('in_question');

    vi.advanceTimersByTime(10000); // question duration
    expect(h.room.status).toBe('showing_result');
    expect(h.find('h').score).toBe(0);
    expect(h.find('g').score).toBe(0);
  });

  it('emits a GOAL event when a player crosses a goal threshold', () => {
    const h = harness();
    h.engine.beginMatch([q('q1'), q('q2'), q('q3')]);
    vi.advanceTimersByTime(1500);

    for (let i = 0; i < 3; i++) {
      h.engine.recordAnswer('h', { selectedAnswer: 'a', clueStage: 0, timeTakenMs: 1000 });
      h.engine.recordAnswer('g', { selectedAnswer: 'b', clueStage: 0, timeTakenMs: 1000 });
      vi.advanceTimersByTime(700);
      if (i < 2) h.engine.nextQuestion();
    }

    // 970 + 1020 + 1070 = 3060 -> crosses 2500 = 1 goal
    expect(h.find('h').score).toBe(3060);
    expect(h.find('h').goals).toBe(1);
    expect(h.events.some((e) => e.kind === 'goal' && e.playerId === 'h')).toBe(true);
  });

  it('ignores a second answer from the same player', () => {
    const h = harness();
    h.engine.beginMatch([q('q1')]);
    vi.advanceTimersByTime(1500);
    h.engine.recordAnswer('h', { selectedAnswer: 'a', clueStage: 0, timeTakenMs: 1000 });
    h.engine.recordAnswer('h', { selectedAnswer: 'b', clueStage: 0, timeTakenMs: 1000 });
    const answers = h.room.answers['q1'];
    expect(answers).toHaveLength(1);
    expect(answers[0].selectedAnswer).toBe('a');
  });

  // --- Stoppage-time sudden death ---

  function reachStoppage(h: ReturnType<typeof harness>) {
    // One question, both correct → 0–0, then enter sudden death.
    h.engine.beginMatch([q('q1')], [q('sd1'), q('sd2')]);
    vi.advanceTimersByTime(1500);
    h.engine.recordAnswer('h', { selectedAnswer: 'a', clueStage: 0, timeTakenMs: 1000 });
    h.engine.recordAnswer('g', { selectedAnswer: 'a', clueStage: 0, timeTakenMs: 1000 });
    vi.advanceTimersByTime(700);
    h.engine.nextQuestion();
  }

  it('enters sudden death when level on goals at full time', () => {
    const h = harness();
    reachStoppage(h);
    expect(h.room.status).toBe('in_question');
    expect(h.room.stoppageRound).toBe(1);
    expect(h.find('h').goals).toBe(0);
    expect(h.find('g').goals).toBe(0);
  });

  it('wins it with a golden goal when one side takes the round', () => {
    const h = harness();
    reachStoppage(h);
    h.engine.recordAnswer('h', { selectedAnswer: 'a', clueStage: 0, timeTakenMs: 1000 });
    h.engine.recordAnswer('g', { selectedAnswer: 'b', clueStage: 0, timeTakenMs: 1000 });
    vi.advanceTimersByTime(700);
    expect(h.find('h').goals).toBe(1); // golden goal applied at the reveal
    expect(h.find('g').goals).toBe(0);
    expect(h.events.some((e) => e.playerId === 'h')).toBe(true);

    h.engine.nextQuestion();
    expect(h.room.status).toBe('finished');
    expect(h.find('h').goals).toBeGreaterThan(h.find('g').goals);
  });

  it('plays another round when sudden death is drawn', () => {
    const h = harness();
    reachStoppage(h);
    h.engine.recordAnswer('h', { selectedAnswer: 'a', clueStage: 0, timeTakenMs: 1000 });
    h.engine.recordAnswer('g', { selectedAnswer: 'a', clueStage: 0, timeTakenMs: 1000 });
    vi.advanceTimersByTime(700);
    expect(h.find('h').goals).toBe(h.find('g').goals); // still level
    h.engine.nextQuestion();
    expect(h.room.status).toBe('in_question');
    expect(h.room.stoppageRound).toBe(2);
  });

  it('falls back to the points decider when no tiebreakers exist', () => {
    const h = harness();
    h.engine.beginMatch([q('q1')]); // no reserves
    vi.advanceTimersByTime(1500);
    h.engine.recordAnswer('h', { selectedAnswer: 'a', clueStage: 0, timeTakenMs: 1000 });
    h.engine.recordAnswer('g', { selectedAnswer: 'a', clueStage: 0, timeTakenMs: 1000 });
    vi.advanceTimersByTime(700);
    h.engine.nextQuestion();
    expect(h.room.status).toBe('finished');
    expect(h.room.stoppageRound ?? 0).toBe(0);
  });

  it('pauses the question clock and restores the remaining time on resume', () => {
    const h = harness();
    h.engine.beginMatch([q('q1'), q('q2')]);
    vi.advanceTimersByTime(1400); // exact kickoff → questionStartedAt aligns with the clock
    expect(h.room.status).toBe('in_question');

    vi.advanceTimersByTime(3000); // 3s elapsed of 10s → 7s remaining
    h.engine.pause();
    expect(h.room.paused).toBe(true);

    // While paused: time passes but the question never resolves...
    vi.advanceTimersByTime(60000);
    expect(h.room.status).toBe('in_question');
    // ...and answers are ignored.
    h.engine.recordAnswer('h', { selectedAnswer: 'a', clueStage: 0, timeTakenMs: 1 });
    expect(h.room.answers['q1']?.length ?? 0).toBe(0);

    h.engine.resume(60000); // resume after a 60s pause
    expect(h.room.paused).toBe(false);

    vi.advanceTimersByTime(6000); // 6s of the 7s that was left
    expect(h.room.status).toBe('in_question');
    vi.advanceTimersByTime(1000); // cross the remaining deadline
    expect(h.room.status).toBe('showing_result');
  });

  it('ignores pause outside a live question', () => {
    const h = harness();
    h.engine.beginMatch([q('q1')]);
    h.engine.pause(); // still in "starting"
    expect(h.room.paused ?? false).toBe(false);
  });
});
