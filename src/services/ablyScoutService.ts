/**
 * AblyScoutService — online 1v1 for The Scout.
 *
 * The Scout's duel engine (`lib/scout/engine`) and its online reducer
 * (`lib/scout/online`) are pure and service-agnostic; this wraps them for
 * cross-device play over an Ably channel (`bk-scout-<CODE>`), mirroring the
 * host-authoritative design of `AblyMysteryService`:
 *
 *   - The HOST holds the authoritative `ScoutSyncState`, applies every action
 *     (its own + the guest's), and broadcasts a redacted snapshot on change.
 *   - The GUEST renders snapshots and sends its actions back to the host.
 *   - Snapshots hide both secret rules until the round is decided; each client
 *     re-injects only its OWN secret locally.
 *   - Anti-spoof: a guest may only act as itself (Ably stamps clientId == id).
 */

import * as Ably from 'ably';
import type { ConnectionState } from '../types/game';
import { generateRoomCode, normalizeRoomCode } from '../lib/roomCode';
import { createAblyRealtime } from '../lib/ablyClient';
import { mapRealtimeState } from './connectionMapping';
import {
  initScoutSync,
  addScoutGuest,
  applyScoutAction,
  redactScoutState,
  localScoutView,
  sideOf,
  type ScoutSyncState,
  type ScoutOnlineAction,
} from '../lib/scout/online';
import { uid } from '../lib/id';

const JOIN_TIMEOUT_MS = 6000;

export class AblyScoutService {
  private realtime: Ably.Realtime | null = null;
  private channel: Ably.RealtimeChannel | null = null;

  private host = false;
  private code = '';
  private localId = '';
  private localName = '';

  /** Host: the authoritative state. Guest: the latest snapshot. */
  private state: ScoutSyncState | null = null;
  /** This device's own secret rule — re-injected into snapshots locally. */
  private mySecret: string | null = null;

  private stateListeners = new Set<(s: ScoutSyncState | null) => void>();
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
    this.state = initScoutSync({ id: this.localId, name: this.localName });
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

  lock(categoryId: string): void {
    this.mySecret = categoryId;
    this.dispatch({ kind: 'lock', playerId: this.localId, categoryId });
  }
  probe(targetId: string): void {
    this.dispatch({ kind: 'probe', playerId: this.localId, targetId });
  }
  accuse(categoryId: string): void {
    this.dispatch({ kind: 'accuse', playerId: this.localId, categoryId });
  }
  rematch(): void {
    this.mySecret = null;
    this.dispatch({ kind: 'rematch', playerId: this.localId });
  }

  /** Host applies locally; guest forwards to the host. */
  private dispatch(action: ScoutOnlineAction): void {
    if (this.host) this.applyAction(action);
    else void this.send('action', action);
  }

  /* --------------------------- subscriptions --------------------------- */

  onState(cb: (s: ScoutSyncState | null) => void): () => void {
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

    const channel = realtime.channels.get(`bk-scout-${this.code}`);
    this.channel = channel;

    channel.subscribe('snapshot', (msg) => {
      if (!this.host) {
        this.state = msg.data as ScoutSyncState;
        this.emitState(this.localView());
      }
    });
    channel.subscribe('join', (msg) => {
      if (this.host) this.hostOnJoin((msg.data as { player: { id: string; name: string } }).player);
    });
    channel.subscribe('request_state', () => {
      if (this.host && this.state) void this.send('snapshot', redactScoutState(this.state));
    });
    channel.subscribe('action', (msg) => {
      if (!this.host) return;
      const action = msg.data as ScoutOnlineAction;
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
    const next = addScoutGuest(this.state, guest);
    this.state = next;
    this.broadcast();
  }

  private applyAction(action: ScoutOnlineAction): void {
    if (!this.state) return;
    const next = applyScoutAction(this.state, action);
    if (next !== this.state) {
      this.state = next;
      this.broadcast();
    } else {
      // No state change (e.g. re-send request) — still nudge self so the local
      // view reflects a just-set mySecret before both sides have locked.
      this.emitState(this.localView());
    }
  }

  /** Host: push the redacted snapshot to the wire and the local view to self. */
  private broadcast(): void {
    if (!this.state) return;
    void this.send('snapshot', redactScoutState(this.state));
    this.emitState(this.localView());
  }

  /* ------------------------------ views ------------------------------ */

  /** The state this device should render: redacted, with its own secret added. */
  private localView(): ScoutSyncState | null {
    if (!this.state) return null;
    const base = this.host ? redactScoutState(this.state) : this.state;
    const mySide = sideOf(base, this.localId);
    if (!mySide) return base;
    return localScoutView(base, mySide, this.mySecret);
  }

  private emitState(s: ScoutSyncState | null): void {
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
