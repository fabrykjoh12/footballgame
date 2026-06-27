/**
 * SupabaseGameService — real-time 1v1 across devices.
 *
 * Architecture: the HOST is authoritative. The host owns a MatchEngine and
 * broadcasts a full Room snapshot on every change over a Supabase Realtime
 * channel (`bk-room-<CODE>`). Guests never run the engine — they render the
 * latest snapshot and send their actions (join / answer) back to the host.
 *
 * Why broadcast (not Postgres CDC)? It needs zero SQL to work the moment the
 * env vars are set, and it keeps the authoritative logic identical to local
 * mode (same MatchEngine). We still best-effort persist rooms/players/answers
 * to the documented tables (see SUPABASE_SETUP.md) when they exist, so you
 * get history without the live loop depending on it.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
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
import { recentlySeenIds } from '../lib/questionHistory';
import { uid } from '../lib/id';
import { getSupabaseClient } from '../lib/supabaseClient';
import { MatchEngine } from './matchEngine';

type BroadcastEvent =
  | 'snapshot'
  | 'join'
  | 'answer'
  | 'request_state'
  | 'leave'
  | 'room_full';

const JOIN_TIMEOUT_MS = 5000;
const MAX_PLAYERS = 2;

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

export class SupabaseGameService implements GameService {
  readonly mode: ServiceMode = 'remote';

  private supabase: SupabaseClient;
  private channel: ReturnType<SupabaseClient['channel']> | null = null;
  private engine: MatchEngine | null = null;

  private isHost = false;
  private roomCode = '';
  private localPlayerId = '';
  /** Guests cache the latest snapshot here (no engine). */
  private snapshot: Room | null = null;

  private roomListeners = new Set<(room: Room | null) => void>();
  private eventListeners = new Set<(event: GameEvent) => void>();

  constructor() {
    const client = getSupabaseClient();
    if (!client) {
      throw new Error('Supabase is not configured');
    }
    this.supabase = client;
  }

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
    void this.persistRoom(room);
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
    this.send('join', { player: guest });
    this.send('request_state', { playerId: guest.id });

    // Wait until the host replies with a snapshot that includes us.
    const room = await new Promise<Room>((resolve, reject) => {
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

    return room;
  }

  async leaveRoom(): Promise<void> {
    this.send('leave', { playerId: this.localPlayerId });
    if (this.channel) {
      await this.supabase.removeChannel(this.channel);
      this.channel = null;
    }
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
    const questions = pickMatchQuestions(settings, undefined, recentlySeenIds());
    this.engine.beginMatch(questions, pickTiebreakers(settings, questions));
  }

  async submitAnswer(input: SubmitAnswerInput): Promise<void> {
    if (this.isHost) {
      this.engine?.recordAnswer(this.localPlayerId, input);
    } else {
      this.send('answer', { playerId: this.localPlayerId, input });
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

  /* ----------------------------- channel ----------------------------- */

  private async openChannel(presenceKey: string): Promise<void> {
    const channel = this.supabase.channel(`bk-room-${this.roomCode}`, {
      config: {
        broadcast: { self: false },
        presence: { key: presenceKey },
      },
    });

    channel.on('broadcast', { event: 'snapshot' }, ({ payload }) => {
      if (!this.isHost) this.applySnapshot(payload as Room);
    });

    // Host-only message handlers.
    channel.on('broadcast', { event: 'join' }, ({ payload }) => {
      if (this.isHost) this.hostOnJoin((payload as { player: Player }).player);
    });
    channel.on('broadcast', { event: 'answer' }, ({ payload }) => {
      if (this.isHost) {
        const p = payload as { playerId: string; input: SubmitAnswerInput };
        this.engine?.recordAnswer(p.playerId, p.input);
      }
    });
    channel.on('broadcast', { event: 'request_state' }, () => {
      if (this.isHost && this.engine) {
        this.send('snapshot', this.engine.getRoom());
      }
    });
    channel.on('broadcast', { event: 'leave' }, ({ payload }) => {
      if (this.isHost) this.hostOnLeave((payload as { playerId: string }).playerId);
    });

    // Presence: mark players connected/disconnected (host authority).
    channel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
      if (!this.isHost || !this.engine) return;
      const room = this.engine.getRoom();
      const leftKeys = new Set(
        (leftPresences as Array<{ presence_ref?: string; key?: string }>).map(
          (p) => p.key,
        ),
      );
      const players = room.players.map((pl) =>
        leftKeys.has(pl.id) ? { ...pl, connected: false } : pl,
      );
      this.engine.setRoom({ ...room, players });
    });

    await new Promise<void>((resolve) => {
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channel.track({ key: presenceKey });
          resolve();
        }
      });
    });

    this.channel = channel;
  }

  private send(event: BroadcastEvent, payload: unknown): void {
    this.channel?.send({ type: 'broadcast', event, payload });
  }

  /* ----------------------------- host logic ----------------------------- */

  private hostOnJoin(player: Player): void {
    if (!this.engine) return;
    const room = this.engine.getRoom();
    if (room.players.some((p) => p.id === player.id)) return;
    if (room.players.length >= MAX_PLAYERS) {
      this.send('room_full', { roomCode: this.roomCode });
      return;
    }
    const joined: Player = { ...player, isHost: false, connected: true };
    this.engine.setRoom({
      ...room,
      players: [...room.players, joined],
      scores: { ...room.scores, [joined.id]: 0 },
    });
    void this.persistPlayer(joined);
  }

  private hostOnLeave(playerId: string): void {
    if (!this.engine) return;
    const room = this.engine.getRoom();
    const players = room.players.map((p) =>
      p.id === playerId ? { ...p, connected: false } : p,
    );
    this.engine.setRoom({ ...room, players });
  }

  /** Host: on every engine change, broadcast the snapshot + persist. */
  private hostHandleRoom(room: Room): void {
    this.emitRoom(room);
    this.send('snapshot', room);
    void this.persistRoomUpdate(room);
  }

  /* ----------------------------- guest logic ----------------------------- */

  private applySnapshot(room: Room): void {
    this.snapshot = room;
    this.emitRoom(room);
  }

  /* ----------------------------- emit ----------------------------- */

  private emitRoom(room: Room | null): void {
    for (const cb of this.roomListeners) cb(room);
  }

  private emitEvent(event: GameEvent): void {
    for (const cb of this.eventListeners) cb(event);
  }

  /* ------------------- best-effort persistence (optional) ------------------- */
  /* These mirror the documented tables. They never block gameplay: if the    */
  /* tables don't exist or RLS rejects, we swallow the error.                  */

  private async persistRoom(room: Room): Promise<void> {
    try {
      await this.supabase.from('rooms').insert({
        room_code: room.roomCode,
        host_id: room.hostId,
        status: room.status,
        settings_json: room.settings,
        selected_questions_json: room.selectedQuestions,
        current_question_index: room.currentQuestionIndex,
      });
    } catch {
      /* tables optional */
    }
  }

  private async persistRoomUpdate(room: Room): Promise<void> {
    try {
      await this.supabase
        .from('rooms')
        .update({
          status: room.status,
          selected_questions_json: room.selectedQuestions,
          current_question_index: room.currentQuestionIndex,
          updated_at: new Date().toISOString(),
        })
        .eq('room_code', room.roomCode);
    } catch {
      /* tables optional */
    }
  }

  private async persistPlayer(player: Player): Promise<void> {
    try {
      await this.supabase.from('room_players').insert({
        room_code: this.roomCode,
        player_name: player.name,
        is_host: player.isHost,
      });
    } catch {
      /* tables optional */
    }
  }
}
