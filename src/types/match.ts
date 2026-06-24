/**
 * Core match domain types — the shared vocabulary for the whole game.
 * Kept React-free so the engine and tests never need to render anything.
 */

export type GameMode = 'cpu' | 'online';

export type Difficulty = 'casual' | 'pro' | 'legend';

/** The six mini-game engines (Phase 2 fills in their implementations). */
export type MiniGameId =
  | 'multiple_choice'
  | 'higher_lower'
  | 'career_path'
  | 'odd_one_out'
  | 'guess_the_year'
  | 'true_false';

export const MINI_GAME_IDS: readonly MiniGameId[] = [
  'multiple_choice',
  'higher_lower',
  'career_path',
  'odd_one_out',
  'guess_the_year',
  'true_false',
];

export const QUESTIONS_PER_MATCH = 10;

/** Which side of the scoreline a participant is on. */
export type Side = 'home' | 'away';

export interface TeamIdentity {
  /** e.g. "Sara FC" */
  name: string;
  /** `r g b` triplets for CSS variables, deterministic from a seed. */
  primaryRgb: string;
  secondaryRgb: string;
}

export interface PlayerInfo {
  id: string;
  displayName: string;
  team: TeamIdentity;
  side: Side;
}

export interface OpponentInfo {
  id: string;
  displayName: string;
  team: TeamIdentity;
  /** Present for CPU opponents; absent for human opponents. */
  difficulty?: Difficulty;
}

/** Generic answer value — narrowed per mini-game at the boundary. */
export type AnswerValue = string | number | boolean;

/** Outcome of a single answer, independent of which mini-game produced it. */
export interface AnswerOutcome {
  correct: boolean;
  /** 0..1 — how close/fast; drives whether a correct answer becomes a goal. */
  quality: number;
  elapsedMs: number;
}

/** The fully resolved result of one question, for both participants. */
export interface QuestionResult {
  index: number;
  miniGame: MiniGameId;
  player: AnswerOutcome;
  opponent: AnswerOutcome;
  /** Goals scored this question, after applying scoring rules. */
  playerGoals: number;
  opponentGoals: number;
}

export interface Scoreline {
  home: number;
  away: number;
}

export interface MatchSummary {
  scoreline: Scoreline;
  /** 'home' | 'away' | 'draw' (only possible if tiebreaker is disabled). */
  winner: Side | 'draw';
  results: QuestionResult[];
  wentToTiebreaker: boolean;
  player: PlayerInfo;
  opponent: OpponentInfo;
}

/** Errors the engine can surface without crashing. */
export type MatchErrorCode =
  | 'ONLINE_UNAVAILABLE'
  | 'OPPONENT_LEFT'
  | 'TRANSPORT_FAILURE'
  | 'MALFORMED_PAYLOAD'
  | 'ILLEGAL_TRANSITION';

export class MatchError extends Error {
  constructor(
    public readonly code: MatchErrorCode,
    message?: string,
  ) {
    super(message ?? code);
    this.name = 'MatchError';
  }
}
