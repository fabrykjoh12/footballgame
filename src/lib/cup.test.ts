import { describe, it, expect } from 'vitest';
import {
  CUPS,
  getCup,
  startCupRun,
  currentRound,
  isFinalRound,
  advanceCupRun,
  roundSettings,
  didWinTie,
  type CupRun,
} from './cup';
import type { Player, Question, Room } from '../types/game';

describe('cup definitions', () => {
  it('have unique ids and at least three escalating rounds each', () => {
    const ids = CUPS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const cup of CUPS) {
      expect(cup.rounds.length).toBeGreaterThanOrEqual(3);
      // Final round clock should be no longer than the first round's.
      expect(cup.rounds[cup.rounds.length - 1].questionDurationMs).toBeLessThanOrEqual(
        cup.rounds[0].questionDurationMs,
      );
    }
  });
});

describe('bracket progression', () => {
  const def = getCup('champions-run')!;

  it('starts at round 0, playing', () => {
    const run = startCupRun('champions-run');
    expect(run).toMatchObject({ cupId: 'champions-run', round: 0, status: 'playing' });
    expect(currentRound(run, def)?.name).toBe('Round of 16');
  });

  it('advances a winner to the next round', () => {
    const run = advanceCupRun(startCupRun('champions-run'), def, true);
    expect(run.status).toBe('playing');
    expect(run.round).toBe(1);
    expect(currentRound(run, def)?.name).toBe('Quarter-final');
  });

  it('knocks out a loser', () => {
    const run = advanceCupRun(startCupRun('champions-run'), def, false);
    expect(run.status).toBe('out');
    expect(currentRound(run, def)).toBeNull();
  });

  it('crowns a champion when the final is won', () => {
    let run: CupRun = startCupRun('champions-run');
    for (let i = 0; i < def.rounds.length - 1; i++) run = advanceCupRun(run, def, true);
    expect(isFinalRound(run, def)).toBe(true);
    run = advanceCupRun(run, def, true);
    expect(run.status).toBe('won');
  });

  it('is a no-op once the run is over', () => {
    const out = advanceCupRun(startCupRun('champions-run'), def, false);
    expect(advanceCupRun(out, def, true)).toEqual(out);
  });
});

describe('roundSettings', () => {
  it('produces a flagged 10-question match with the round mode + clock', () => {
    const s = roundSettings(getCup('world-cup-dream')!.rounds[3]);
    expect(s).toMatchObject({ mode: 'nightmare', questionCount: 10, cupMatch: true });
    expect(s.questionDurationMs).toBeGreaterThan(0);
  });
});

function player(id: string, over: Partial<Player> = {}): Player {
  return {
    id,
    name: id,
    isHost: false,
    connected: true,
    score: 0,
    goals: 0,
    correctAnswers: 0,
    streak: 0,
    bestStreak: 0,
    fastestAnswerMs: null,
    ...over,
  };
}

function room(me: Partial<Player>, opp: Partial<Player>): Room {
  const selectedQuestions: Question[] = [
    {
      id: 'q0',
      type: 'club_country',
      difficulty: 'easy',
      category: 'clubs',
      prompt: '?',
      options: ['a', 'b', 'c', 'd'],
      correctAnswer: 'a',
      explanation: '',
    },
  ];
  return {
    roomCode: 'BK1',
    hostId: 'me',
    players: [player('me', me), player('opp', opp)],
    settings: { mode: 'serious', questionCount: 10, questionDurationMs: 12000, cupMatch: true },
    currentQuestionIndex: 0,
    selectedQuestions,
    answers: {},
    scores: {},
    status: 'finished',
    questionStartedAt: null,
    lastResult: null,
    createdAt: 1,
  };
}

describe('didWinTie', () => {
  it('wins on more goals', () => {
    expect(didWinTie(room({ goals: 3 }, { goals: 1 }), 'me')).toBe(true);
  });
  it('wins a goal tie on points', () => {
    expect(didWinTie(room({ goals: 2, score: 5000 }, { goals: 2, score: 1000 }), 'me')).toBe(true);
  });
  it('counts a dead-level tie as elimination', () => {
    expect(didWinTie(room({ goals: 1, score: 1000 }, { goals: 1, score: 1000 }), 'me')).toBe(false);
  });
  it('loses on fewer goals', () => {
    expect(didWinTie(room({ goals: 0 }, { goals: 2 }), 'me')).toBe(false);
  });
});
