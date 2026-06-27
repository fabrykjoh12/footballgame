/**
 * AblyGameService — real-time 1v1 across devices, powered by Ably Realtime.
 *
 * Same design as the Supabase service: the HOST is authoritative. It owns a
 * MatchEngine and publishes a full Room snapshot on every change to an Ably
 * channel (`bk-room-<CODE>`). Guests never run the engine — they render the
 * latest snapshot and publish their actions (join / answer) back to the host.
 *
 * Ably needs no database and no server to deploy, so there's nothing to
 * persist here — the channel IS the transport. Presence is used to detect a
 * player disconnecting.
 */

import * as Ably from 'ably';
import type {
  ConnectionState,
  GameEvent,
  GameService,
  MatchSettings,
  Player,
  Room,
  ServiceMode,
  SubmitAnswerInput,
} from '../types/game';
import { defaultSettings } from '../lib/matchModes';
import { generateRoomCode, normalizeRoomCode } from '../lib/roomCode';
import { pickMatchQuestions, pickTiebreakers } from '../lib/questionPicker';
import { recentlySeenSet } from '../lib/questionHistory';
import { uid } from '../lib/id';
import { createAblyRealtime } from '../lib/ablyClient';
import { mapRealtimeState } from './connectionMapping';
import { MatchEngine } from './matchEngine';

type ChannelEvent =
  | 'snapshot'
  | 'join'
  | 'answer'
  | 'request_state'
  | 'leave'
  | 'room_full';

const JOIN_TIMEOUT_MS = 6000;
const MAX_PLAYERS = 2;
/** How long a guest waits for the host to return before declaring the match lost. */
const HOST_AWAY_GRACE_MS = 12000;

function makePlayer(name: string, isHost: boolean): Player {
  return {
    id: uid('p'),
    name: name.trim() || 'Player',
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

export class AblyGameService implements GameService {
  readonly mode: ServiceMode = 'remote';

  private realtime: Ably.Realtime | null = null;
  private channel: Ably.RealtimeChannel | null = null;
  private engine: MatchEngine | null = null;

  private isHost = false;
  private roomCode = '';
  private localPlayerId = '';
  /** Guests cache the latest snapshot here (no engine). */
  private snapshot: Room | null = null;

  private roomListeners = new Set<(room: Room | null) => void>();
  private eventListeners = new Set<(event: GameEvent) => void>();
  private connectionListeners = new Set<(state: ConnectionState) => void>();
  private connectionState: ConnectionState = 'connected';
  private hasConnectedOnce = false;

  /** Guest-side: pin a question's countdown to local receipt time (anti-skew). */
  private rebasedQuestionKey: string | null = null;
  private rebasedStartedAt: number | null = null;

  /** Guest-side: the host's presence has dropped and we're awaiting its return. */
  private hostAway = false;
  private hostAwayTimer: ReturnType<typeof setTimeout> | null = null;

  getLocalPlayerId(): string {
    return this.localPlayerId;
  }

  /* ------------------------------ rooms ------------------------------ */

  async createRoom(playerName: string): Promise<Room> {
    this.isHost = true;
    const host = makePlayer(playerName, true);
    this.localPlayerId = host.id;
    this.roomCode = generateRoomCode();

    const room: Room = {
      roomCode: this.roomCode,
      hostId: host.id,
      players: [host],
      settings: defaultSettings('casual'),
      currentQuestionIndex: 0,
      selectedQuestions: [],
      answers: {},
      scores: { [host.id]: 0 },
      status: 'lobby',
      questionStartedAt: null,
      lastResult: null,
      createdAt: Date.now(),
    };

    this.engine = new MatchEngine(room, {
      onRoom: (r) => this.hostHandleRoom(r),
      onEvent: (e) => this.emitEvent(e),
    });

    await this.openChannel(host.id);
    this.emitRoom(room);
    return room;
  }

  async joinRoom(roomCode: string, playerName: string): Promise<Room> {
    this.isHost = false;
    this.roomCode = normalizeRoomCode(roomCode);
    const guest = makePlayer(playerName, false);
    this.localPlayerId = guest.id;

    await this.openChannel(guest.id);

    // Announce ourselves and ask the host for the current state.
    void this.send('join', { player: guest });
    void this.send('request_state', { playerId: guest.id });

    // Resolve once the host replies with a snapshot that includes us.
    return new Promise<Room>((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup();
        reject(
          new Error(
            `No room "${this.roomCode}" found. Check the code, or the host may have left.`,
          ),
        );
      }, JOIN_TIMEOUT_MS);

      const unsub = this.onRoomUpdate((r) => {
        if (r && r.players.some((p) => p.id === guest.id)) {
          cleanup();
          resolve(r);
        }
      });

      const cleanup = () => {
        clearTimeout(timeout);
        unsub();
      };
    });
  }

  async leaveRoom(): Promise<void> {
    try {
      void this.send('leave', { playerId: this.localPlayerId });
      await this.channel?.presence.leave();
    } catch {
      /* best effort */
    }
    if (this.hostAwayTimer) {
      clearTimeout(this.hostAwayTimer);
      this.hostAwayTimer = null;
    }
    this.realtime?.close();
    this.realtime = null;
    this.channel = null;
    this.engine?.dispose();
    this.engine = null;
    this.snapshot = null;
    this.emitRoom(null);
  }

  async updateSettings(settings: Partial<MatchSettings>): Promise<void> {
    if (!this.isHost || !this.engine) return;
    const room = this.engine.getRoom();
    if (room.status !== 'lobby') return;
    this.engine.setRoom({ ...room, settings: { ...room.settings, ...settings } });
  }

  async startMatch(): Promise<void> {
    if (!this.isHost || !this.engine) return;
    const settings = this.engine.getRoom().settings;
    const questions = pickMatchQuestions(settings, undefined, recentlySeenSet());
    this.engine.beginMatch(questions, pickTiebreakers(settings, questions));
  }

  async submitAnswer(input: SubmitAnswerInput): Promise<void> {
    if (this.isHost) {
      this.engine?.recordAnswer(this.localPlayerId, input);
    } else {
      void this.send('answer', { playerId: this.localPlayerId, input });
    }
  }

  async nextQuestion(): Promise<void> {
    if (this.isHost) this.engine?.nextQuestion();
  }

  async rematch(): Promise<void> {
    await this.startMatch();
  }

  /* --------------------------- subscriptions --------------------------- */

  onRoomUpdate(cb: (room: Room | null) => void): () => void {
    this.roomListeners.add(cb);
    cb(this.engine?.getRoom() ?? this.snapshot ?? null);
    return () => this.roomListeners.delete(cb);
  }

  onEvent(cb: (event: GameEvent) => void): () => void {
    this.eventListeners.add(cb);
    return () => this.eventListeners.delete(cb);
  }

  onConnectionState(cb: (state: ConnectionState) => void): () => void {
    this.connectionListeners.add(cb);
    cb(this.connectionState);
    return () => this.connectionListeners.delete(cb);
  }

  /* ----------------------------- channel ----------------------------- */

  private async openChannel(clientId: string): Promise<void> {
    const realtime = createAblyRealtime(clientId);
    if (!realtime) throw new Error('Ably is not configured');
    this.realtime = realtime;

    realtime.connection.on((change) => this.handleConnectionChange(change.current));

    const channel = realtime.channels.get(`bk-room-${this.roomCode}`);
    this.channel = channel;

    channel.subscribe('snapshot', (msg) => {
      if (!this.isHost) this.applySnapshot(msg.data as Room);
    });

    // Host-only message handlers.
    channel.subscribe('join', (msg) => {
      if (this.isHost) this.hostOnJoin((msg.data as { player: Player }).player);
    });
    channel.subscribe('answer', (msg) => {
      if (this.isHost) {
        const p = msg.data as { playerId: string; input: SubmitAnswerInput };
        this.engine?.recordAnswer(p.playerId, p.input);
      }
    });
    channel.subscribe('request_state', () => {
      if (this.isHost && this.engine) {
        void this.send('snapshot', this.engine.getRoom());
      }
    });
    channel.subscribe('leave', (msg) => {
      if (this.isHost) {
        this.hostMarkDisconnected((msg.data as { playerId: string }).playerId);
      }
    });

    // Presence: detect a player dropping / rejoining (host authority).
    channel.presence.subscribe('leave', (member) => {
      if (this.isHost && member.clientId) {
        this.hostMarkDisconnected(member.clientId);
      }
    });
    channel.presence.subscribe('enter', (member) => {
      if (this.isHost && member.clientId) {
        this.hostMarkConnected(member.clientId);
      }
    });

    // Guest-side: notice if the HOST (the authoritative engine) drops, so the
    // match doesn't silently freeze. A brief blip resolves itself when the host
    // re-enters or the next snapshot arrives; a real drop surfaces as 'failed'.
    channel.presence.subscribe('leave', (member) => {
      if (!this.isHost && member.clientId && member.clientId === this.snapshot?.hostId) {
        this.onHostAway();
      }
    });
    channel.presence.subscribe('enter', (member) => {
      if (!this.isHost && member.clientId && member.clientId === this.snapshot?.hostId) {
        this.clearHostAway();
      }
    });

    await channel.attach();
    // Presence is only used to detect disconnects; if the key lacks the
    // presence capability, multiplayer should still work.
    try {
      await channel.presence.enter();
    } catch {
      /* presence unavailable — non-fatal */
    }
  }

  private async send(event: ChannelEvent, payload: unknown): Promise<void> {
    try {
      await this.channel?.publish(event, payload);
    } catch {
      /* transient publish error; snapshots are idempotent */
    }
  }

  /* ----------------------------- host logic ----------------------------- */

  private hostOnJoin(player: Player): void {
    if (!this.engine) return;
    const room = this.engine.getRoom();
    if (room.players.some((p) => p.id === player.id)) return;
    if (room.players.length >= MAX_PLAYERS) {
      void this.send('room_full', { roomCode: this.roomCode });
      return;
    }
    const joined: Player = { ...player, isHost: false, connected: true };
    this.engine.setRoom({
      ...room,
      players: [...room.players, joined],
      scores: { ...room.scores, [joined.id]: 0 },
    });
  }

  private hostMarkDisconnected(playerId: string): void {
    if (!this.engine) return;
    const room = this.engine.getRoom();
    if (playerId === room.hostId) return; // never drop the host
    if (!room.players.some((p) => p.id === playerId)) return;

    if (room.status === 'lobby') {
      // Before kickoff: free the slot so a fresh opponent can join.
      const scores = { ...room.scores };
      delete scores[playerId];
      this.engine.setRoom({
        ...room,
        players: room.players.filter((p) => p.id !== playerId),
        scores,
      });
      return;
    }

    // Mid-match: keep the player (and their score) but flag them disconnected.
    if (!room.players.some((p) => p.id === playerId && p.connected)) return;
    this.engine.setRoom({
      ...room,
      players: room.players.map((p) =>
        p.id === playerId ? { ...p, connected: false } : p,
      ),
    });
  }

  private hostMarkConnected(playerId: string): void {
    if (!this.engine) return;
    const room = this.engine.getRoom();
    const player = room.players.find((p) => p.id === playerId);
    if (!player || player.connected) return;
    this.engine.setRoom({
      ...room,
      players: room.players.map((p) =>
        p.id === playerId ? { ...p, connected: true } : p,
      ),
    });
  }

  /** Host: on every engine change, broadcast the snapshot. */
  private hostHandleRoom(room: Room): void {
    this.emitRoom(room);
    void this.send('snapshot', room);
  }

  /* ----------------------------- guest logic ----------------------------- */

  private applySnapshot(room: Room): void {
    // A fresh snapshot proves the host is alive — clear any host-away state.
    this.clearHostAway();
    this.snapshot = this.rebaseQuestionClock(room);
    this.emitRoom(this.snapshot);
  }

  /** Guest: the host dropped. Show "reconnecting", ask for state, then give up. */
  private onHostAway(): void {
    if (this.hostAway) return;
    this.hostAway = true;
    if (this.connectionState === 'connected') {
      this.connectionState = 'reconnecting';
      this.emitConnectionState('reconnecting');
    }
    void this.send('request_state', { playerId: this.localPlayerId });
    if (this.hostAwayTimer) clearTimeout(this.hostAwayTimer);
    this.hostAwayTimer = setTimeout(() => {
      if (this.hostAway) {
        this.connectionState = 'failed';
        this.emitConnectionState('failed');
      }
    }, HOST_AWAY_GRACE_MS);
  }

  /** Guest: the host is back (re-entered presence or a snapshot arrived). */
  private clearHostAway(): void {
    if (this.hostAwayTimer) {
      clearTimeout(this.hostAwayTimer);
      this.hostAwayTimer = null;
    }
    if (!this.hostAway) return;
    this.hostAway = false;
    if (this.connectionState !== 'connected') {
      this.connectionState = 'connected';
      this.emitConnectionState('connected');
    }
  }

  /**
   * Neutralise host/guest clock skew: pin each question's countdown to the
   * instant this guest received it, and reuse that start for later updates of
   * the same question so the timer doesn't jump when answers arrive.
   */
  private rebaseQuestionClock(room: Room): Room {
    if (room.status !== 'in_question' || room.questionStartedAt == null) {
      this.rebasedQuestionKey = null;
      this.rebasedStartedAt = null;
      return room;
    }
    const key = `${room.currentQuestionIndex}:${room.questionStartedAt}`;
    if (key !== this.rebasedQuestionKey) {
      this.rebasedQuestionKey = key;
      this.rebasedStartedAt = Date.now();
    }
    return {
      ...room,
      questionStartedAt: this.rebasedStartedAt ?? room.questionStartedAt,
    };
  }

  /* ----------------------------- emit ----------------------------- */

  private emitRoom(room: Room | null): void {
    for (const cb of this.roomListeners) cb(room);
  }

  private emitEvent(event: GameEvent): void {
    for (const cb of this.eventListeners) cb(event);
  }

  private emitConnectionState(state: ConnectionState): void {
    for (const cb of this.connectionListeners) cb(state);
  }

  private handleConnectionChange(state: Ably.ConnectionState): void {
    const next = mapRealtimeState(state);
    if (!next) return; // ignore initialized / closing / closed (intentional)

    const firstConnect = !this.hasConnectedOnce;
    // Before the first successful connect, the provider's "Connecting…" UI
    // already covers it — don't flash a reconnecting/failed banner.
    if (next !== 'connected' && firstConnect) return;

    const wasDown = this.connectionState !== 'connected';
    this.connectionState = next;
    this.emitConnectionState(next);

    if (next === 'connected') {
      this.hasConnectedOnce = true;
      // On a genuine reconnect, a guest re-requests authoritative state.
      if (wasDown && !firstConnect && !this.isHost) {
        void this.send('request_state', { playerId: this.localPlayerId });
      }
    }
  }
}
