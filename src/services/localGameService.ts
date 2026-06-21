/**
 * LocalGameService — fully offline play (no backend required).
 *
 * Powers both "Local Demo" and, when Supabase isn't configured, "Create
 * Room" / "Join Room". The opponent is a bot so the entire match loop is
 * testable on one device:
 *
 *   - createRoom: you are the host; a bot opponent joins the lobby shortly
 *     after, then you choose a mode and kick off.
 *   - joinRoom: you are the guest; a bot acts as host and starts the match
 *     itself — this exercises the non-host "waiting for host" experience.
 */

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
import { generateRoomCode } from '../lib/roomCode';
import { pickMatchQuestions } from '../lib/questionPicker';
import { uid } from '../lib/id';
import { MatchEngine } from './matchEngine';
import { decideBotAnswer } from './botPlayer';

const BOT_NAMES = ['CPU United', 'Bot Rovers', 'AI Athletic', 'Pixel City'];
const BOT_JOIN_DELAY_MS = 1500;
const BOT_HOST_START_DELAY_MS = 2600;

function makePlayer(name: string, isHost: boolean, isBot = false): Player {
  return {
    id: uid(isBot ? 'bot' : 'p'),
    name: name.trim() || (isBot ? 'CPU' : 'Player'),
    isHost,
    isBot,
    connected: true,
    score: 0,
    goals: 0,
    correctAnswers: 0,
    streak: 0,
    bestStreak: 0,
    fastestAnswerMs: null,
  };
}

function randomBotName(): string {
  return BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
}

export class LocalGameService implements GameService {
  readonly mode: ServiceMode = 'local';

  private engine: MatchEngine | null = null;
  private localPlayerId = '';
  private botPlayerId = '';

  private roomListeners = new Set<(room: Room | null) => void>();
  private eventListeners = new Set<(event: GameEvent) => void>();

  private botAnswerTimer: ReturnType<typeof setTimeout> | null = null;
  private lobbyTimer: ReturnType<typeof setTimeout> | null = null;
  private scheduledBotQuestionId: string | null = null;

  getLocalPlayerId(): string {
    return this.localPlayerId;
  }

  /* ------------------------------ rooms ------------------------------ */

  async createRoom(playerName: string): Promise<Room> {
    const host = makePlayer(playerName, true, false);
    this.localPlayerId = host.id;
    const room = this.freshRoom(host);
    this.initEngine(room);

    // A bot opponent "joins" the lobby a moment later.
    this.lobbyTimer = setTimeout(() => this.botJoin(), BOT_JOIN_DELAY_MS);
    return room;
  }

  async joinRoom(_roomCode: string, playerName: string): Promise<Room> {
    // In local mode there is no real host to find, so we simulate one: a bot
    // hosts and the human is the guest. This demos the join / waiting flow.
    const botHost = makePlayer(randomBotName(), true, true);
    const guest = makePlayer(playerName, false, false);
    this.localPlayerId = guest.id;
    this.botPlayerId = botHost.id;

    const room = this.freshRoom(botHost);
    room.players = [botHost, guest];
    room.scores = { [botHost.id]: 0, [guest.id]: 0 };
    this.initEngine(room);

    // The bot host starts the match by itself after a short wait.
    this.lobbyTimer = setTimeout(() => {
      const r = this.engine?.getRoom();
      if (r && r.status === 'lobby') this.beginMatchAsHost();
    }, BOT_HOST_START_DELAY_MS);

    return room;
  }

  async leaveRoom(): Promise<void> {
    this.clearTimers();
    this.engine?.dispose();
    this.engine = null;
    this.scheduledBotQuestionId = null;
    this.emitRoom(null);
  }

  async updateSettings(settings: Partial<MatchSettings>): Promise<void> {
    const room = this.engine?.getRoom();
    if (!room || room.status !== 'lobby') return;
    this.engine?.setRoom({ ...room, settings: { ...room.settings, ...settings } });
  }

  async startMatch(): Promise<void> {
    this.beginMatchAsHost();
  }

  async submitAnswer(input: SubmitAnswerInput): Promise<void> {
    this.engine?.recordAnswer(this.localPlayerId, input);
  }

  async nextQuestion(): Promise<void> {
    this.engine?.nextQuestion();
  }

  async rematch(): Promise<void> {
    this.beginMatchAsHost();
  }

  /* --------------------------- subscriptions --------------------------- */

  onRoomUpdate(cb: (room: Room | null) => void): () => void {
    this.roomListeners.add(cb);
    cb(this.engine?.getRoom() ?? null);
    return () => this.roomListeners.delete(cb);
  }

  onEvent(cb: (event: GameEvent) => void): () => void {
    this.eventListeners.add(cb);
    return () => this.eventListeners.delete(cb);
  }

  /* ----------------------------- internals ----------------------------- */

  private freshRoom(host: Player): Room {
    return {
      roomCode: generateRoomCode(),
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
  }

  private initEngine(room: Room): void {
    this.engine = new MatchEngine(room, {
      onRoom: (r) => this.handleRoom(r),
      onEvent: (e) => this.emitEvent(e),
    });
    this.emitRoom(room);
  }

  private botJoin(): void {
    const room = this.engine?.getRoom();
    if (!room || room.status !== 'lobby') return;
    const bot = makePlayer(randomBotName(), false, true);
    this.botPlayerId = bot.id;
    this.engine?.setRoom({
      ...room,
      players: [...room.players, bot],
      scores: { ...room.scores, [bot.id]: 0 },
    });
  }

  private beginMatchAsHost(): void {
    const room = this.engine?.getRoom();
    if (!room || !this.engine) return;
    // Ensure there is an opponent before kicking off.
    if (room.players.length < 2) this.botJoin();
    const questions = pickMatchQuestions(this.engine.getRoom().settings);
    this.engine.beginMatch(questions);
  }

  /** Fan out room updates and drive bot answering during questions. */
  private handleRoom(room: Room): void {
    this.emitRoom(room);

    if (room.status !== 'in_question') {
      this.scheduledBotQuestionId = null;
      if (this.botAnswerTimer) {
        clearTimeout(this.botAnswerTimer);
        this.botAnswerTimer = null;
      }
      return;
    }

    const question = room.selectedQuestions[room.currentQuestionIndex];
    if (!question || !this.botPlayerId) return;
    if (this.scheduledBotQuestionId === question.id) return;

    const alreadyAnswered = (room.answers[question.id] ?? []).some(
      (a) => a.playerId === this.botPlayerId,
    );
    if (alreadyAnswered) return;

    this.scheduledBotQuestionId = question.id;
    const decision = decideBotAnswer(question, room.settings.questionDurationMs);
    if (this.botAnswerTimer) clearTimeout(this.botAnswerTimer);
    this.botAnswerTimer = setTimeout(() => {
      this.engine?.recordAnswer(this.botPlayerId, {
        selectedAnswer: decision.selectedAnswer,
        clueStage: decision.clueStage,
        timeTakenMs: decision.timeTakenMs,
      });
    }, decision.delayMs);
  }

  private emitRoom(room: Room | null): void {
    for (const cb of this.roomListeners) cb(room);
  }

  private emitEvent(event: GameEvent): void {
    for (const cb of this.eventListeners) cb(event);
  }

  private clearTimers(): void {
    if (this.botAnswerTimer) clearTimeout(this.botAnswerTimer);
    if (this.lobbyTimer) clearTimeout(this.lobbyTimer);
    this.botAnswerTimer = null;
    this.lobbyTimer = null;
  }
}
