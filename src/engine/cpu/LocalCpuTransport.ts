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

export class LocalCpuTransport implements MatchTransport {
  readonly mode = 'cpu' as const;
  private readonly rng: Rng;
  private readonly handlers = new Set<(e: OpponentEvent) => void>();
  private readonly pending = new Set<() => void>();
  private readonly answered = new Set<number>();
  private readonly difficulty: Difficulty;
  private readonly opponent: OpponentInfo;
  private readonly schedule: (fn: () => void, ms: number) => () => void;
  private disconnected = false;

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
    for (const cancel of this.pending) cancel();
    this.pending.clear();
    this.handlers.clear();
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

    // `let` (not `const`) so a synchronous scheduler — used in tests — can run
    // the callback before assignment without hitting the temporal dead zone.
    let cancel: (() => void) | null = null;
    const run = () => {
      if (cancel) this.pending.delete(cancel);
      if (this.disconnected) return;
      const outcome = simulateCpuOutcome(this.difficulty, this.rng);
      this.emit({ t: 'opponent_answer', questionIndex, outcome });
    };
    cancel = this.schedule(run, delay);
    this.pending.add(cancel);
  }

  private emit(event: OpponentEvent): void {
    for (const handler of this.handlers) handler(event);
  }
}
