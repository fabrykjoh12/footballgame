/**
 * AblyMysteryService — online 1v1 for the Mystery Player Duel.
 *
 * The Mystery engine (`lib/mysteryPlayer/`) is pure and service-agnostic; this
 * wraps it for cross-device play over an Ably channel (`bk-mystery-<CODE>`),
 * mirroring the host-authoritative design of `AblyGameService`:
 *
 *   - The HOST holds the authoritative `MysteryState`, applies every action
 *     (its own + the guest's), and broadcasts a snapshot on each change.
 *   - The GUEST renders snapshots and sends its actions back to the host.
 *
 * Two online-specific rules make it fair:
 *   - Answer mode is forced to **manual** — auto-answering would require the
 *     opponent's secret-player metadata on your device, which would leak it.
 *   - Snapshots are **redacted**: each player's secret pick is hidden from the
 *     other until the round is decided. Each client re-injects only its OWN
 *     secret locally. The host still knows both (it judges guesses), but never
 *     broadcasts them mid-round.
 */

import * as Ably from 'ably';
import type { ConnectionState } from '../types/game';
import { generateRoomCode, normalizeRoomCode } from '../lib/roomCode';
import { createAblyRealtime } from '../lib/ablyClient';
import { mapRealtimeState } from './connectionMapping';
import {
  createMysteryGame,
  lockPlayer,
  askVerified,
  askFree,
  answerFree,
  answerVerifiedManual,
  makeGuess,
  skipTurn,
  nextRound,
} from '../lib/mysteryPlayer/mysteryPlayerEngine';
import type {
  DuelPlayer,
  FreeAnswer,
  MysteryState,
  RoomSettings,
  VerifiedQuestion,
} from '../lib/mysteryPlayer/mysteryPlayerTypes';
import { uid } from '../lib/id';

type MysteryAction =
  | { kind: 'lock'; playerId: string; choiceId: string }
  | { kind: 'askVerified'; playerId: string; question: VerifiedQuestion }
  | { kind: 'askFree'; playerId: string; text: string }
  | { kind: 'answer'; answer: FreeAnswer }
  | { kind: 'guess'; playerId: string; guessId: string }
  | { kind: 'skip'; playerId: string }
  | { kind: 'nextRound' };

const JOIN_TIMEOUT_MS = 6000;

/** Phases where the round is decided, so secrets may safely be revealed. */
function isRevealed(state: MysteryState): boolean {
  return state.phase === 'round_over' || state.phase === 'match_over';
}

/** Hide every secret pick (used for the broadcast snapshot mid-round). */
function redactSecrets(state: MysteryState): MysteryState {
  if (isRevealed(state)) return state;
  const secret: Record<string, string | null> = {};
  for (const key of Object.keys(state.secret)) secret[key] = state.locked[key] ? '' : null;
  return { ...state, secret };
}

export class AblyMysteryService {
  private realtime: Ably.Realtime | null = null;
  private channel: Ably.RealtimeChannel | null = null;

  private host = false;
  private code = '';
  private localId = '';
  private localName = '';
  private settings: RoomSettings | null = null;

  /** Host: the authoritative state. Guest: the latest snapshot. */
  private state: MysteryState | null = null;
  /** This device's own secret pick — re-injected into snapshots locally. */
  private mySecret: string | null = null;

  private stateListeners = new Set<(s: MysteryState | null) => void>();
  private connListeners = new Set<(s: ConnectionState) => void>();
  private connectionState: ConnectionState = 'connected';
  private hasConnectedOnce = false;

  getLocalPlayerId(): string {
    return this.localId;
  }
  isHostPlayer(): boolean {
    return this.host;
  }
  getRoomCode(): string {
    return this.code;
  }

  /* ------------------------------ lifecycle ------------------------------ */

  async createRoom(name: string, settings: RoomSettings): Promise<string> {
    this.host = true;
    this.localId = uid('p');
    this.localName = name.trim() || 'Player';
    // Online answers are always manual (auto-answer would leak the secret).
    this.settings = { ...settings, answerMode: 'manual' };
    this.code = generateRoomCode();
    await this.openChannel();
    return this.code;
  }

  async joinRoom(code: string, name: string): Promise<void> {
    this.host = false;
    this.localId = uid('p');
    this.localName = name.trim() || 'Player';
    this.code = normalizeRoomCode(code);
    await this.openChannel();

    const guest: DuelPlayer = { id: this.localId, name: this.localName, isCpu: false };
    void this.send('join', { player: guest });
    void this.send('request_state', {});

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error(`No duel "${this.code}" found. Check the code or the host may have left.`));
      }, JOIN_TIMEOUT_MS);
      const unsub = this.onState((s) => {
        if (s && s.players.some((p) => p.id === this.localId)) {
          cleanup();
          resolve();
        }
      });
      const cleanup = () => {
        clearTimeout(timeout);
        unsub();
      };
    });
  }

  async leave(): Promise<void> {
    try {
      await this.channel?.presence.leave();
    } catch {
      /* best effort */
    }
    this.realtime?.close();
    this.realtime = null;
    this.channel = null;
    this.state = null;
    this.emitState(null);
  }

  /* ------------------------------ actions ------------------------------ */

  lock(choiceId: string): void {
    this.mySecret = choiceId;
    this.dispatch({ kind: 'lock', playerId: this.localId, choiceId });
  }
  ask(question: VerifiedQuestion): void {
    this.dispatch({ kind: 'askVerified', playerId: this.localId, question });
  }
  askText(text: string): void {
    this.dispatch({ kind: 'askFree', playerId: this.localId, text });
  }
  answer(answer: FreeAnswer): void {
    this.dispatch({ kind: 'answer', answer });
  }
  guess(guessId: string): void {
    this.dispatch({ kind: 'guess', playerId: this.localId, guessId });
  }
  skip(): void {
    this.dispatch({ kind: 'skip', playerId: this.localId });
  }
  startNextRound(): void {
    this.dispatch({ kind: 'nextRound' });
  }

  /** Host applies locally; guest forwards to the host. */
  private dispatch(action: MysteryAction): void {
    if (this.host) this.applyAction(action);
    else void this.send('action', action);
  }

  /* --------------------------- subscriptions --------------------------- */

  onState(cb: (s: MysteryState | null) => void): () => void {
    this.stateListeners.add(cb);
    cb(this.localView());
    return () => this.stateListeners.delete(cb);
  }
  onConnectionState(cb: (s: ConnectionState) => void): () => void {
    this.connListeners.add(cb);
    cb(this.connectionState);
    return () => this.connListeners.delete(cb);
  }

  /* ------------------------------ channel ------------------------------ */

  private async openChannel(): Promise<void> {
    const realtime = createAblyRealtime(this.localId);
    if (!realtime) throw new Error('Ably is not configured');
    this.realtime = realtime;
    realtime.connection.on((c) => this.handleConnectionChange(c.current));

    const channel = realtime.channels.get(`bk-mystery-${this.code}`);
    this.channel = channel;

    channel.subscribe('snapshot', (msg) => {
      if (!this.host) {
        this.state = msg.data as MysteryState;
        this.emitState(this.localView());
      }
    });
    channel.subscribe('join', (msg) => {
      if (this.host) this.hostOnJoin((msg.data as { player: DuelPlayer }).player);
    });
    channel.subscribe('request_state', () => {
      if (this.host && this.state) void this.send('snapshot', redactSecrets(this.state));
    });
    channel.subscribe('action', (msg) => {
      if (this.host) this.applyAction(msg.data as MysteryAction);
    });

    await channel.attach();
    try {
      await channel.presence.enter();
    } catch {
      /* presence optional */
    }
  }

  private async send(event: string, payload: unknown): Promise<void> {
    try {
      await this.channel?.publish(event, payload);
    } catch {
      /* transient; snapshots are idempotent */
    }
  }

  /* ------------------------------ host logic ------------------------------ */

  private hostOnJoin(guest: DuelPlayer): void {
    if (this.state) {
      // Already in progress / already have an opponent — re-send state to sync.
      void this.send('snapshot', redactSecrets(this.state));
      return;
    }
    if (!this.settings) return;
    const host: DuelPlayer = { id: this.localId, name: this.localName, isCpu: false };
    this.state = createMysteryGame({ settings: this.settings, players: [host, guest] });
    this.broadcast();
  }

  private applyAction(action: MysteryAction): void {
    if (!this.state) return;
    const s = this.state;
    let next = s;
    switch (action.kind) {
      case 'lock':
        next = lockPlayer(s, action.playerId, action.choiceId);
        break;
      case 'askVerified':
        next = askVerified(s, action.playerId, action.question);
        break;
      case 'askFree':
        next = askFree(s, action.playerId, action.text);
        break;
      case 'answer':
        next = s.pendingVerified ? answerVerifiedManual(s, action.answer) : answerFree(s, action.answer);
        break;
      case 'guess':
        next = makeGuess(s, action.playerId, action.guessId);
        break;
      case 'skip':
        next = skipTurn(s, action.playerId);
        break;
      case 'nextRound':
        next = nextRound(s);
        break;
    }
    if (next !== s) {
      this.state = next;
      this.broadcast();
    }
  }

  /** Host: push the redacted snapshot to the wire and the local view to self. */
  private broadcast(): void {
    if (!this.state) return;
    void this.send('snapshot', redactSecrets(this.state));
    this.emitState(this.localView());
  }

  /* ------------------------------ views ------------------------------ */

  /** The state this device should render: redacted, with its own secret added. */
  private localView(): MysteryState | null {
    if (!this.state) return null;
    const base = this.host ? redactSecrets(this.state) : this.state;
    if (this.mySecret == null) return base;
    return { ...base, secret: { ...base.secret, [this.localId]: this.mySecret } };
  }

  private emitState(s: MysteryState | null): void {
    for (const cb of this.stateListeners) cb(s);
  }
  private emitConn(s: ConnectionState): void {
    for (const cb of this.connListeners) cb(s);
  }

  private handleConnectionChange(state: Ably.ConnectionState): void {
    const next = mapRealtimeState(state);
    if (!next) return;
    if (next !== 'connected' && !this.hasConnectedOnce) return;
    this.connectionState = next;
    this.emitConn(next);
    if (next === 'connected') {
      this.hasConnectedOnce = true;
      if (!this.host) void this.send('request_state', {});
    }
  }
}
