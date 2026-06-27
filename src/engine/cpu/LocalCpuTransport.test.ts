import { describe, it, expect } from 'vitest';
import { LocalCpuTransport } from './LocalCpuTransport.ts';
import type { OpponentEvent } from '../../types/realtime.ts';
import type { OpponentInfo } from '../../types/match.ts';

const opponent: OpponentInfo = {
  id: 'cpu',
  displayName: 'CPU',
  difficulty: 'pro',
  team: { name: 'Jonas United', primaryRgb: '96 165 250', secondaryRgb: '0 0 0' },
};

/** Synchronous scheduler so tests don't depend on real timers. */
const immediate = (fn: () => void): (() => void) => {
  fn();
  return () => {};
};

function makeTransport() {
  const events: OpponentEvent[] = [];
  const t = new LocalCpuTransport({
    opponent,
    difficulty: 'pro',
    seed: 1,
    schedule: immediate,
  });
  t.subscribe((e) => events.push(e));
  return { t, events };
}

describe('LocalCpuTransport', () => {
  it('announces the opponent and readiness on ready', () => {
    const { t, events } = makeTransport();
    t.send({ t: 'ready', matchId: 'm1' });
    expect(events.map((e) => e.t)).toEqual(['opponent_found', 'opponent_ready']);
  });

  it('answers an opened question', () => {
    const { t, events } = makeTransport();
    t.send({ t: 'question_open', questionIndex: 0, deadline: 0 });
    const answer = events.find((e) => e.t === 'opponent_answer');
    expect(answer).toBeDefined();
    if (answer?.t === 'opponent_answer') {
      expect(answer.questionIndex).toBe(0);
    }
  });

  it('does not answer the same question twice', () => {
    const { t, events } = makeTransport();
    t.send({ t: 'question_open', questionIndex: 0, deadline: 0 });
    t.send({ t: 'question_open', questionIndex: 0, deadline: 0 });
    const answers = events.filter((e) => e.t === 'opponent_answer');
    expect(answers).toHaveLength(1);
  });

  it('offers a rematch when requested', () => {
    const { t, events } = makeTransport();
    t.send({ t: 'rematch_request' });
    expect(events.some((e) => e.t === 'rematch_offered')).toBe(true);
  });

  it('emits nothing after disconnect', () => {
    const { t, events } = makeTransport();
    t.disconnect();
    t.send({ t: 'question_open', questionIndex: 1, deadline: 0 });
    expect(events).toHaveLength(0);
  });

  it('does not answer while paused, then answers after resume', () => {
    // A manual scheduler so we control exactly when timers fire.
    const tasks: Array<{ fn: () => void; cancelled: boolean }> = [];
    const schedule = (fn: () => void): (() => void) => {
      const task = { fn, cancelled: false };
      tasks.push(task);
      return () => {
        task.cancelled = true;
      };
    };
    const events: OpponentEvent[] = [];
    const t = new LocalCpuTransport({ opponent, difficulty: 'pro', seed: 1, schedule });
    t.subscribe((e) => events.push(e));

    t.send({ t: 'question_open', questionIndex: 0, deadline: 0 });
    t.pause();
    // The originally-armed timer is cancelled while paused.
    expect(tasks.every((task) => task.cancelled)).toBe(true);

    t.resume();
    // Fire whatever is live now and confirm the answer lands.
    tasks.filter((task) => !task.cancelled).forEach((task) => task.fn());
    expect(events.some((e) => e.t === 'opponent_answer')).toBe(true);
  });
});
