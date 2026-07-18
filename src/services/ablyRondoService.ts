/**
 * AblyRondoService — online 1v1 for Rondo.
 *
 * Rondo's engine (`lib/rondo/engine`) and its online reducer
 * (`lib/rondo/online`) are pure and service-agnostic; this wraps them for
 * cross-device play over an Ably channel (`bk-rondo-<CODE>`), mirroring the
 * host-authoritative design of `AblyScoutService`:
 *
 *   - The HOST holds the authoritative `RondoSyncState`, applies every action
 *     (its own + the guest's), and broadcasts the snapshot on change. Rondo has
 *     no secrets, so nothing is redacted — the whole state goes on the wire.
 *   - The GUEST renders snapshots and sends its actions back to the host.
 *   - The turn clock is host-authoritative: the host stamps `turnDeadline` on
 *     each turn change and runs a fallback timer, so a rally always resolves on
 *     time even if a client never sends a `timeout`.
 *   - Anti-spoof: a guest may only act as itself (Ably stamps clientId == id).
 */

import * as Ably from 'ably';
import type { ConnectionState } from '../types/game';
import { generateRoomCode, normalizeRoomCode } from '../lib/roomCode';
import { createAblyRealtime } from '../lib/ablyClient';
import { mapRealtimeState } from './connectionMapping';
import { hashString } from '../lib/seededRandom';
import {
  initRondoSync,
  addRondoGuest,
  applyRondoAction,
  type RondoSyncState,
  type RondoOnlineAction,
} from '../lib/rondo/online';
import { uid } from '../lib/id';

const JOIN_TIMEOUT_MS = 6000;

export class AblyRondoService {
  private realtime: Ably.Realtime | null = null;
  private channel: Ably.RealtimeChannel | null = null;

  private host = false;
  private code = '';
  private localId = '';
  private localName = '';

  /** Host: the authoritative state. Guest: the latest snapshot. */
  private state: RondoSyncState | null = null;
  /** Host-only fallback timer that fires the turn's timeout at its deadline. */
  private deadlineTimer: ReturnType<typeof setTimeout> | null = null;

  private stateListeners = new Set<(s: RondoSyncState | null) => void>();
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

  async createRoom(name: string): Promise<string> {
    this.host = true;
    this.localId = uid('p');
    this.localName = name.trim() || 'Player';
    this.code = generateRoomCode();
    this.state = initRondoSync({ id: this.localId, name: this.localName }, hashString(this.code));
    await this.openChannel();
    this.broadcast();
    return this.code;
  }

  async joinRoom(code: string, name: string): Promise<void> {
    this.host = false;
    this.localId = uid('p');
    this.localName = name.trim() || 'Player';
    this.code = normalizeRoomCode(code);
    await this.openChannel();

    void this.send('join', { player: { id: this.localId, name: this.localName } });
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
    this.clearDeadlineTimer();
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

  name(targetId: string): void {
    this.dispatch({ kind: 'name', playerId: this.localId, targetId });
  }
  timeout(): void {
    this.dispatch({ kind: 'timeout', playerId: this.localId });
  }
  rematch(): void {
    this.dispatch({ kind: 'rematch', playerId: this.localId });
  }

  /** Host applies locally; guest forwards to the host. */
  private dispatch(action: RondoOnlineAction): void {
    if (this.host) this.applyAction(action);
    else void this.send('action', action);
  }

  /* --------------------------- subscriptions --------------------------- */

  onState(cb: (s: RondoSyncState | null) => void): () => void {
    this.stateListeners.add(cb);
    cb(this.state);
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

    const channel = realtime.channels.get(`bk-rondo-${this.code}`);
    this.channel = channel;

    channel.subscribe('snapshot', (msg) => {
      if (!this.host) {
        this.state = msg.data as RondoSyncState;
        this.emitState(this.state);
      }
    });
    channel.subscribe('join', (msg) => {
      if (this.host) this.hostOnJoin((msg.data as { player: { id: string; name: string } }).player);
    });
    channel.subscribe('request_state', () => {
      if (this.host && this.state) void this.send('snapshot', this.state);
    });
    channel.subscribe('action', (msg) => {
      if (!this.host) return;
      const action = msg.data as RondoOnlineAction;
      // Anti-spoof: a guest may only act as itself.
      if (msg.clientId && action.playerId !== msg.clientId) return;
      this.applyAction(action);
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

  private hostOnJoin(guest: { id: string; name: string }): void {
    if (!this.state) return;
    const next = addRondoGuest(this.state, guest, Date.now());
    if (next !== this.state) {
      this.state = next;
      this.broadcast();
    }
  }

  private applyAction(action: RondoOnlineAction): void {
    if (!this.state) return;
    const next = applyRondoAction(this.state, action, Date.now());
    if (next !== this.state) {
      this.state = next;
      this.broadcast();
    }
  }

  /** Host: push the snapshot to the wire + self, and re-arm the turn timer. */
  private broadcast(): void {
    if (!this.state) return;
    void this.send('snapshot', this.state);
    this.emitState(this.state);
    if (this.host) this.armDeadlineTimer();
  }

  /**
   * Host fallback: schedule a timeout for the on-clock side at its deadline, so
   * a rally always resolves even if neither client sends one.
   */
  private armDeadlineTimer(): void {
    this.clearDeadlineTimer();
    const s = this.state;
    if (!s || !s.match || s.match.phase === 'over' || s.turnDeadline == null) return;
    const onClock = s.players.find((p) => p.side === s.match!.rally.turn);
    if (!onClock) return;
    const delay = Math.max(0, s.turnDeadline - Date.now()) + 250; // small network grace
    this.deadlineTimer = setTimeout(() => {
      this.applyAction({ kind: 'timeout', playerId: onClock.id });
    }, delay);
  }

  private clearDeadlineTimer(): void {
    if (this.deadlineTimer) {
      clearTimeout(this.deadlineTimer);
      this.deadlineTimer = null;
    }
  }

  /* ------------------------------ misc ------------------------------ */

  private emitState(s: RondoSyncState | null): void {
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
