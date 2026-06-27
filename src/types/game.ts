/**
 * Ball Knowledge — core domain types.
 *
 * These types are the single source of truth for the question database,
 * the scoring engine, and the game/room state machine. Keep them small and
 * stable: adding a new mini-game = add a new question variant to the
 * `Question` union and a branch in the scoring/UI layers.
 */

/** Mini-game types. */
export type QuestionType =
  | 'who_am_i'
  | 'career_path'
  | 'higher_lower'
  | 'club_country'
  | 'guess_year'
  | 'transfer_fee'
  | 'pitch_position'
  | 'odd_one_out'
  | 'spot_the_lie';

export type Difficulty = 'easy' | 'medium' | 'hard' | 'nightmare';

/** Loose category tag used for stats / future filtering. */
export type Category =
  | 'players'
  | 'clubs'
  | 'countries'
  | 'leagues'
  | 'champions_league'
  | 'world_cup'
  | 'transfers'
  | 'history';

interface BaseQuestion {
  id: string;
  type: QuestionType;
  difficulty: Difficulty;
  category: Category;
  /** Short factual note shown on the result reveal screen. */
  explanation: string;
}

/** "WHO AM I?" — clues revealed over time, multiple choice answer. */
export interface WhoAmIQuestion extends BaseQuestion {
  type: 'who_am_i';
  /** Ordered clues; clue[0] shown first, more revealed every 5s. */
  clues: string[];
  options: string[];
  correctAnswer: string;
}

/** "CAREER PATH" — guess the player from their club timeline. */
export interface CareerPathQuestion extends BaseQuestion {
  type: 'career_path';
  /** Ordered club path. Use "???" to hide a club on harder variants. */
  path: string[];
  options: string[];
  correctAnswer: string;
}

export interface HigherLowerOption {
  name: string;
  /** Numeric value for the category being compared. */
  value: number;
}

/** "HIGHER OR LOWER" — pick which of two players ranks higher. */
export interface HigherLowerQuestion extends BaseQuestion {
  type: 'higher_lower';
  prompt: string;
  leftOption: HigherLowerOption;
  rightOption: HigherLowerOption;
  /** Must equal leftOption.name or rightOption.name. */
  correctAnswer: string;
  /** Unit label shown when values are revealed, e.g. "goals", "caps". */
  unit?: string;
}

/** "GUESS THE CLUB / COUNTRY" — general football trivia, multiple choice. */
export interface ClubCountryQuestion extends BaseQuestion {
  type: 'club_country';
  prompt: string;
  options: string[];
  correctAnswer: string;
}

/** "GUESS THE YEAR" — football history; pick the year, shown chronologically. */
export interface GuessYearQuestion extends BaseQuestion {
  type: 'guess_year';
  prompt: string;
  /** Four year strings, e.g. "2016". Sorted ascending for display. */
  options: string[];
  correctAnswer: string;
}

/** "TRANSFER FEE" — guess the headline fee of a famous move from 4 options. */
export interface TransferFeeQuestion extends BaseQuestion {
  type: 'transfer_fee';
  prompt: string;
  /** Four fee strings sharing one currency, e.g. "€222m". */
  options: string[];
  correctAnswer: string;
}

/** "ON THE PITCH" — tap the player's primary role on a four-line pitch grid. */
export interface PitchPositionQuestion extends BaseQuestion {
  type: 'pitch_position';
  prompt: string;
  /** Always the four PITCH_ZONES (kept for MC validity + bot reuse). */
  options: string[];
  correctAnswer: string;
}

/** "ODD ONE OUT" — pick the option that doesn't belong / is the exception. */
export interface OddOneOutQuestion extends BaseQuestion {
  type: 'odd_one_out';
  prompt: string;
  /** Four options; correctAnswer is the one that does NOT belong. */
  options: string[];
  correctAnswer: string;
}

/** "SPOT THE LIE" — four statements, pick the one that is FALSE. */
export interface SpotTheLieQuestion extends BaseQuestion {
  type: 'spot_the_lie';
  prompt: string;
  /** Four statements; correctAnswer is the FALSE one. */
  options: string[];
  correctAnswer: string;
}

export type Question =
  | WhoAmIQuestion
  | CareerPathQuestion
  | HigherLowerQuestion
  | ClubCountryQuestion
  | GuessYearQuestion
  | TransferFeeQuestion
  | PitchPositionQuestion
  | OddOneOutQuestion
  | SpotTheLieQuestion;

/* ------------------------------------------------------------------ */
/* Match settings & difficulty modes                                   */
/* ------------------------------------------------------------------ */

export type MatchMode = 'casual' | 'serious' | 'nightmare';

export interface MatchModeConfig {
  id: MatchMode;
  label: string;
  description: string;
  difficulties: Difficulty[];
}

export interface MatchSettings {
  mode: MatchMode;
  questionCount: number;
  /** Per-question time budget in milliseconds. */
  questionDurationMs: number;
  /** When set, question selection is deterministic (Daily Challenge). */
  seed?: number;
  /** Marks a Daily Challenge match so its result is recorded against the day. */
  isDaily?: boolean;
  /** Preferred question topics (soft filter; tops up if a topic is short). */
  categories?: Category[];
}

/* ------------------------------------------------------------------ */
/* Room / player / answer state                                        */
/* ------------------------------------------------------------------ */

export type RoomStatus =
  | 'idle'
  | 'lobby'
  | 'starting'
  | 'in_question'
  | 'showing_result'
  | 'finished';

export interface Player {
  id: string;
  name: string;
  isHost: boolean;
  score: number;
  goals: number;
  correctAnswers: number;
  streak: number;
  bestStreak: number;
  /** Fastest correct answer in ms; null until the first correct answer. */
  fastestAnswerMs: number | null;
  /** True for the simulated opponent in local/demo mode. */
  isBot?: boolean;
  connected: boolean;
}

export interface PlayerAnswer {
  playerId: string;
  questionId: string;
  /** null = ran out of time without answering. */
  selectedAnswer: string | null;
  isCorrect: boolean;
  /** Epoch ms when the answer was submitted. */
  answeredAt: number;
  timeTakenMs: number;
  pointsEarned: number;
  /** For who_am_i: which clue stage was visible when answered (0-based). */
  clueStage: number;
}

/** Transparent breakdown of how points for one answer were computed. */
export interface PointsBreakdown {
  base: number;
  speedBonus: number;
  streakBonus: number;
  total: number;
}

/** Per-player payload shown on the result reveal screen. */
export interface PlayerResult {
  playerId: string;
  selectedAnswer: string | null;
  isCorrect: boolean;
  timeTakenMs: number;
  breakdown: PointsBreakdown;
  /** Crossed into a new goal threshold on this question. */
  scoredGoal: boolean;
  /** Football-flavoured event labels, e.g. "GOAL!", "Counterattack!". */
  events: string[];
}

/** Result data for the most recently revealed question. */
export interface QuestionResult {
  questionId: string;
  questionType: QuestionType;
  correctAnswer: string;
  explanation: string;
  results: Record<string, PlayerResult>;
  /** For higher_lower: reveal the underlying numbers. */
  revealValues?: { left: HigherLowerOption; right: HigherLowerOption; unit?: string };
}

export interface Room {
  roomCode: string;
  hostId: string;
  players: Player[];
  settings: MatchSettings;
  currentQuestionIndex: number;
  selectedQuestions: Question[];
  /** All submitted answers, keyed by questionId. */
  answers: Record<string, PlayerAnswer[]>;
  /** Convenience score map, keyed by playerId. */
  scores: Record<string, number>;
  status: RoomStatus;
  /** Epoch ms the active question started (drives the timer + clue reveals). */
  questionStartedAt: number | null;
  /** Reveal payload for the current showing_result phase. */
  lastResult: QuestionResult | null;
  /** Reserve sudden-death questions (host-picked) for stoppage time. */
  tiebreakers?: Question[];
  /** 0/undefined = normal play; n = the nth sudden-death round in progress. */
  stoppageRound?: number;
  /** When true, the match clock and the opponent are frozen (manual pause). */
  paused?: boolean;
  createdAt: number;
}

/* ------------------------------------------------------------------ */
/* Football-flavoured live events (for the GOAL! overlay etc.)         */
/* ------------------------------------------------------------------ */

export type GameEventKind =
  | 'goal'
  | 'equalizer'
  | 'late_winner'
  | 'hat_trick'
  | 'counterattack';

export interface GameEvent {
  kind: GameEventKind;
  playerId: string;
  label: string;
  /** Unique id so the UI can key/dedupe transient overlays. */
  nonce: number;
}

/* ------------------------------------------------------------------ */
/* Service layer contract                                              */
/* ------------------------------------------------------------------ */

/** 'local' = offline vs a bot; 'remote' = networked vs a real player. */
export type ServiceMode = 'local' | 'remote';

export interface SubmitAnswerInput {
  selectedAnswer: string | null;
  clueStage: number;
  timeTakenMs: number;
}

/**
 * Backend-agnostic contract used by the React layer. `LocalGameService`
 * (demo / bot opponent) and `SupabaseGameService` (real-time multiplayer)
 * both implement it, so the UI never knows which backend is active.
 */
export interface GameService {
  readonly mode: ServiceMode;
  getLocalPlayerId(): string;

  createRoom(playerName: string): Promise<Room>;
  joinRoom(roomCode: string, playerName: string): Promise<Room>;
  leaveRoom(): Promise<void>;

  updateSettings(settings: Partial<MatchSettings>): Promise<void>;
  startMatch(): Promise<void>;
  submitAnswer(input: SubmitAnswerInput): Promise<void>;
  /** Host-only: advance from the result reveal to the next question. */
  nextQuestion(): Promise<void>;
  rematch(): Promise<void>;

  /**
   * Freeze / unfreeze the live match (clock + opponent) for both sides.
   * Optional: backends that can't coordinate a shared pause omit these.
   */
  pause?(): Promise<void>;
  resume?(): Promise<void>;

  /** Subscribe to room snapshots. Returns an unsubscribe fn. */
  onRoomUpdate(cb: (room: Room | null) => void): () => void;
  /** Subscribe to transient football events (GOAL! etc.). */
  onEvent(cb: (event: GameEvent) => void): () => void;
  /** Subscribe to realtime connection health (remote backends only). */
  onConnectionState?(cb: (state: ConnectionState) => void): () => void;
}

/** Health of the realtime transport, surfaced to the UI as a banner. */
export type ConnectionState = 'connected' | 'reconnecting' | 'failed';
