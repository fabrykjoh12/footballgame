/**
 * LocalCpuTransport — a fully offline opponent that satisfies MatchTransport.
 *
 * It listens for the engine's `question_open` events and, after a simulated
 * "thinking" delay, emits an `opponent_answer` with an outcome drawn from the
 * CPU difficulty model. To the engine this is indistinguishable from a remote
 * human, which is exactly why offline and online share one code path.
 */

import type { MatchTransport } from '../../transport/MatchTransport.ts';
import type { Difficulty, OpponentInfo } from '../../types/match.ts';
import type { OpponentEvent, PlayerEvent } from '../../types/realtime.ts';
import { createRng, type Rng } from '../../lib/rng.ts';
import { cpuResponseDelay, simulateCpuOutcome } from './cpuDifficulty.ts';

export interface LocalCpuOptions {
  opponent: OpponentInfo;
  difficulty: Difficulty;
  seed: number;
  /** Override scheduling for tests (default: setTimeout). */
  schedule?: (fn: () => void, ms: number) => () => void;
}

const defaultSchedule = (fn: () => void, ms: number): (() => void) => {
  const id = setTimeout(fn, ms);
  return () => clearTimeout(id);
};

interface PendingAnswer {
  questionIndex: number;
  /** Absolute epoch-ms the answer is due to fire. */
  fireAt: number;
  /** Cancels the currently-armed timer. */
  cancel: () => void;
  /** Remaining ms captured while paused (null when running). */
  remaining: number | null;
}

export class LocalCpuTransport implements MatchTransport {
  readonly mode = 'cpu' as const;
  private readonly rng: Rng;
  private readonly handlers = new Set<(e: OpponentEvent) => void>();
  private readonly pending = new Set<PendingAnswer>();
  private readonly answered = new Set<number>();
  private readonly difficulty: Difficulty;
  private readonly opponent: OpponentInfo;
  private readonly schedule: (fn: () => void, ms: number) => () => void;
  private disconnected = false;
  private paused = false;

  constructor(opts: LocalCpuOptions) {
    this.rng = createRng(opts.seed);
    this.difficulty = opts.difficulty;
    this.opponent = opts.opponent;
    this.schedule = opts.schedule ?? defaultSchedule;
  }

  send(event: PlayerEvent): void {
    if (this.disconnected) return;
    switch (event.t) {
      case 'ready':
        // CPU is always ready immediately.
        this.emit({ t: 'opponent_found', opponent: this.opponent });
        this.emit({ t: 'opponent_ready' });
        break;
      case 'question_open':
        this.scheduleAnswer(event.questionIndex, event.deadline);
        break;
      case 'rematch_request':
        this.emit({ t: 'rematch_offered' });
        break;
      case 'answer':
      case 'leave':
        // The CPU answers on its own schedule; the player's own answer and
        // leave intents need no opponent-side reaction here.
        break;
    }
  }

  subscribe(handler: (e: OpponentEvent) => void): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  disconnect(): void {
    this.disconnected = true;
    for (const entry of this.pending) entry.cancel();
    this.pending.clear();
    this.handlers.clear();
  }

  /** Freeze the opponent: capture each pending answer's remaining think-time. */
  pause(): void {
    if (this.paused || this.disconnected) return;
    this.paused = true;
    const now = Date.now();
    for (const entry of this.pending) {
      entry.cancel();
      entry.remaining = Math.max(0, entry.fireAt - now);
    }
  }

  /** Re-arm each pending answer with the think-time it had left. */
  resume(): void {
    if (!this.paused || this.disconnected) return;
    this.paused = false;
    const now = Date.now();
    for (const entry of [...this.pending]) {
      const delay = entry.remaining ?? Math.max(0, entry.fireAt - now);
      entry.fireAt = now + delay;
      entry.remaining = null;
      this.arm(entry, delay);
    }
  }

  private scheduleAnswer(questionIndex: number, deadline: number): void {
    if (this.answered.has(questionIndex)) return;
    this.answered.add(questionIndex);

    let delay = cpuResponseDelay(this.difficulty, this.rng);
    // Never answer after the deadline; leave a small buffer.
    if (deadline > 0) {
      const now = Date.now();
      const budget = Math.max(200, deadline - now - 150);
      delay = Math.min(delay, budget);
    }

    const entry: PendingAnswer = {
      questionIndex,
      fireAt: Date.now() + delay,
      cancel: () => {},
      remaining: this.paused ? delay : null,
    };
    this.pending.add(entry);
    // If we're paused, leave it disarmed — resume() will arm it.
    if (!this.paused) this.arm(entry, delay);
  }

  private arm(entry: PendingAnswer, delayMs: number): void {
    const run = () => {
      this.pending.delete(entry);
      if (this.disconnected) return;
      const outcome = simulateCpuOutcome(this.difficulty, this.rng);
      this.emit({ t: 'opponent_answer', questionIndex: entry.questionIndex, outcome });
    };
    entry.cancel = this.schedule(run, delayMs);
  }

  private emit(event: OpponentEvent): void {
    for (const handler of this.handlers) handler(event);
  }
}
