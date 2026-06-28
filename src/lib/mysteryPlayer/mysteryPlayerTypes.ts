/**
 * Mystery Player Duel — domain types.
 *
 * A standalone deduction mode: each side secretly picks any player from the
 * Mystery Player database, then players take turns asking yes/no questions to
 * work out the opponent's pick. First correct guess wins. No difficulty system;
 * flexible house rules via room settings.
 */

export type Continent =
  | 'Europe'
  | 'South America'
  | 'North America'
  | 'Africa'
  | 'Asia'
  | 'Oceania';

export type PlayerRole =
  | 'goalkeeper'
  | 'defender'
  | 'midfielder'
  | 'forward'
  | 'winger'
  | 'striker';

/** A selectable mystery player with structured metadata for verified answers. */
export interface MysteryPlayer {
  id: string;
  name: string;
  nationality: string;
  continent: Continent;
  /** Broad + specific roles, e.g. ['forward','striker']. */
  positions: PlayerRole[];
  primaryPosition: PlayerRole;
  /** Clubs played for (senior career), chronological-ish. */
  clubs: string[];
  /** Leagues played in (canonical names; top-five use the labels below). */
  leagues: string[];
  /** First senior season year. */
  debutYear: number;
  /** Last season year; omitted = still active. */
  lastYear?: number;
  active: boolean;
  won: {
    championsLeague: boolean;
    ballonDor: boolean;
    worldCup: boolean;
    euros: boolean;
    copaAmerica: boolean;
    leagueTitle: boolean;
  };
}

/** Canonical top-five league names (used by league questions + derived flags). */
export const TOP_FIVE_LEAGUES = [
  'Premier League',
  'La Liga',
  'Serie A',
  'Bundesliga',
  'Ligue 1',
] as const;

/* ------------------------------------------------------------------ */
/* Verified questions                                                  */
/* ------------------------------------------------------------------ */

export type TrophyKey = 'cl' | 'ballon_dor' | 'world_cup' | 'euros' | 'copa' | 'league';
export type StatusKey = 'active' | 'retired' | 'multi_top5' | 'over_three_clubs';
export type EraKey = 'before_2010' | 'after_2010' | '2000s' | '2010s' | '2020s';

export type VerifiedQuestion =
  | { kind: 'club'; value: string }
  | { kind: 'league'; value: string }
  | { kind: 'country'; value: string }
  | { kind: 'continent'; value: Continent }
  | { kind: 'position'; value: PlayerRole }
  | { kind: 'trophy'; value: TrophyKey }
  | { kind: 'status'; value: StatusKey }
  | { kind: 'era'; value: EraKey };

export type FreeAnswer = 'yes' | 'no' | 'unsure';

export interface HistoryEntry {
  id: number;
  round: number;
  askerId: string;
  type: 'verified' | 'free' | 'guess';
  label: string;
  /** Verified → boolean; free → FreeAnswer; guess → boolean (correct?). */
  answer: boolean | FreeAnswer;
}

/** A verified fact a player has learned about their opponent. */
export interface VerifiedFact {
  question: VerifiedQuestion;
  answer: boolean;
}

/* ------------------------------------------------------------------ */
/* Room settings & state                                               */
/* ------------------------------------------------------------------ */

export type QuestionMode = 'verified' | 'free' | 'mixed';
/**
 * How structured (verified) questions get answered:
 *  - `auto`   — answered automatically from the opponent's secret metadata
 *               (great vs CPU / solo).
 *  - `manual` — the opponent taps Yes/No/Unsure themselves (authentic Guess
 *               Who; the natural mode for two humans / online). The candidate
 *               helper still filters on a Yes/No answer.
 */
export type AnswerMode = 'auto' | 'manual';
export type WrongGuessPenalty = 'lose_turn' | 'free_question' | 'instant_loss' | 'none';
export type MatchFormat = 'single' | 'bo3' | 'bo5';
export type TurnTimer = 15 | 30 | 45 | 60;

export interface RoomSettings {
  timerOn: boolean;
  turnTimer: TurnTimer;
  questionMode: QuestionMode;
  answerMode: AnswerMode;
  candidateHelper: boolean;
  penalty: WrongGuessPenalty;
  format: MatchFormat;
}

export const DEFAULT_SETTINGS: RoomSettings = {
  timerOn: false,
  turnTimer: 30,
  questionMode: 'mixed',
  answerMode: 'auto',
  candidateHelper: true,
  penalty: 'free_question',
  format: 'single',
};

export interface DuelPlayer {
  id: string;
  name: string;
  isCpu: boolean;
}

export type DuelPhase =
  | 'selecting'
  | 'active'
  | 'awaiting_manual'
  | 'round_over'
  | 'match_over';

export interface MysteryState {
  phase: DuelPhase;
  settings: RoomSettings;
  players: [DuelPlayer, DuelPlayer];
  /** Locked secret player id per duel player (null until locked). */
  secret: Record<string, string | null>;
  locked: Record<string, boolean>;
  /** Commit hashes per player (fairness / online readiness). */
  commit: Record<string, string>;
  turn: string;
  /** Pending free-text question awaiting a manual answer. */
  pendingFree: { askerId: string; text: string } | null;
  /** Pending structured question awaiting a manual Yes/No (answerMode 'manual'). */
  pendingVerified: { askerId: string; question: VerifiedQuestion } | null;
  /** A player owed a bonus question (from the free-question penalty). */
  bonusFor: string | null;
  history: HistoryEntry[];
  knowledge: Record<string, VerifiedFact[]>;
  questionsAsked: Record<string, number>;
  wrongGuesses: Record<string, number>;
  roundNumber: number;
  matchScore: Record<string, number>;
  /** Winner of the just-finished round. */
  roundWinner: string | null;
  /** Overall match winner once decided. */
  winner: string | null;
}
