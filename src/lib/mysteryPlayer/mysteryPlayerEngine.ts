/**
 * Mystery Player Duel — pure state machine.
 *
 * All rules live here as pure transitions over `MysteryState`; the UI renders
 * snapshots and dispatches actions. Service-agnostic (local hot-seat / CPU now;
 * the same transitions can drive an online backend later).
 */

import { MYSTERY_PLAYERS, mysteryPlayerById } from '../../data/mysteryPlayers';
import { answerVerified, questionLabel } from './mysteryPlayerQuestions';
import { filterCandidates } from './mysteryPlayerCandidateFilter';
import { commitPick } from './mysteryPlayerCommit';
import { matchWinner } from './mysteryPlayerScoring';
import type {
  DuelPlayer,
  FreeAnswer,
  MysteryPlayer,
  MysteryState,
  RoomSettings,
  VerifiedQuestion,
} from './mysteryPlayerTypes';

export interface CreateOptions {
  settings: RoomSettings;
  players: [DuelPlayer, DuelPlayer];
  /** Stable salt for commits + which side starts (deterministic in tests). */
  salt?: string;
}

const blankRecord = <T>(players: DuelPlayer[], v: () => T): Record<string, T> =>
  Object.fromEntries(players.map((p) => [p.id, v()]));

export function createMysteryGame(opts: CreateOptions): MysteryState {
  const { settings, players } = opts;
  return {
    phase: 'selecting',
    settings,
    players,
    secret: blankRecord(players, () => null as string | null),
    locked: blankRecord(players, () => false),
    commit: blankRecord(players, () => ''),
    turn: players[0].id,
    pendingFree: null,
    bonusFor: null,
    history: [],
    knowledge: blankRecord(players, () => []),
    questionsAsked: blankRecord(players, () => 0),
    wrongGuesses: blankRecord(players, () => 0),
    roundNumber: 1,
    matchScore: blankRecord(players, () => 0),
    roundWinner: null,
    winner: null,
  };
}

export function opponentOf(state: MysteryState, playerId: string): string {
  return state.players.find((p) => p.id !== playerId)!.id;
}

export function currentCandidates(state: MysteryState, playerId: string): MysteryPlayer[] {
  return filterCandidates(MYSTERY_PLAYERS, state.knowledge[playerId] ?? []);
}

/** Shallow-clone the mutable collections so transitions stay pure. */
function clone(s: MysteryState): MysteryState {
  return {
    ...s,
    secret: { ...s.secret },
    locked: { ...s.locked },
    commit: { ...s.commit },
    knowledge: Object.fromEntries(
      Object.entries(s.knowledge).map(([k, v]) => [k, [...v]]),
    ),
    questionsAsked: { ...s.questionsAsked },
    wrongGuesses: { ...s.wrongGuesses },
    matchScore: { ...s.matchScore },
    history: [...s.history],
    pendingFree: s.pendingFree ? { ...s.pendingFree } : null,
  };
}

/** Pass the turn, honouring a pending bonus question for the asker. */
function passTurn(s: MysteryState, fromId: string): void {
  if (s.bonusFor === fromId) {
    s.bonusFor = null; // consume the bonus → same player asks again
    s.turn = fromId;
  } else {
    s.turn = opponentOf(s, fromId);
  }
}

/** Lock a player's secret pick. Both locked → the duel begins. */
export function lockPlayer(
  state: MysteryState,
  playerId: string,
  choiceId: string,
  salt = playerId,
): MysteryState {
  if (state.phase !== 'selecting') return state;
  if (state.locked[playerId]) return state;
  if (!mysteryPlayerById(choiceId)) return state;
  const s = clone(state);
  s.secret[playerId] = choiceId;
  s.commit[playerId] = commitPick(choiceId, salt);
  s.locked[playerId] = true;
  if (state.players.every((p) => s.locked[p.id])) {
    s.phase = 'active';
    s.turn = state.players[0].id;
  }
  return s;
}

function pushHistory(
  s: MysteryState,
  entry: Omit<MysteryState['history'][number], 'id' | 'round'>,
): void {
  s.history.push({ ...entry, id: s.history.length + 1, round: s.roundNumber });
}

/** Ask a verified question — answered automatically from the opponent's pick. */
export function askVerified(
  state: MysteryState,
  playerId: string,
  question: VerifiedQuestion,
): MysteryState {
  if (state.phase !== 'active' || state.turn !== playerId) return state;
  const oppId = opponentOf(state, playerId);
  const oppPlayer = mysteryPlayerById(state.secret[oppId] ?? '');
  if (!oppPlayer) return state;

  const answer = answerVerified(oppPlayer, question);
  const s = clone(state);
  s.knowledge[playerId] = [...s.knowledge[playerId], { question, answer }];
  s.questionsAsked[playerId] += 1;
  pushHistory(s, { askerId: playerId, type: 'verified', label: questionLabel(question), answer });
  passTurn(s, playerId);
  return s;
}

/** Ask a free-text question — needs a manual answer from the opponent. */
export function askFree(state: MysteryState, playerId: string, text: string): MysteryState {
  if (state.phase !== 'active' || state.turn !== playerId) return state;
  const trimmed = text.trim();
  if (!trimmed) return state;
  const s = clone(state);
  s.phase = 'awaiting_manual';
  s.pendingFree = { askerId: playerId, text: trimmed };
  return s;
}

/** Resolve a pending free question with the opponent's manual answer. */
export function answerFree(state: MysteryState, answer: FreeAnswer): MysteryState {
  if (state.phase !== 'awaiting_manual' || !state.pendingFree) return state;
  const askerId = state.pendingFree.askerId;
  const s = clone(state);
  pushHistory(s, { askerId, type: 'free', label: state.pendingFree.text, answer });
  s.questionsAsked[askerId] += 1;
  s.pendingFree = null;
  s.phase = 'active';
  passTurn(s, askerId);
  return s;
}

function recordRoundWin(s: MysteryState, winnerId: string): void {
  s.matchScore[winnerId] += 1;
  s.roundWinner = winnerId;
  const mw = matchWinner(s.matchScore, s.settings.format);
  if (mw) {
    s.winner = mw;
    s.phase = 'match_over';
  } else {
    s.phase = 'round_over';
  }
}

/** Make a final guess at the opponent's player. */
export function makeGuess(
  state: MysteryState,
  playerId: string,
  guessId: string,
): MysteryState {
  if (state.phase !== 'active' || state.turn !== playerId) return state;
  const oppId = opponentOf(state, playerId);
  const correct = state.secret[oppId] === guessId;
  const s = clone(state);
  const guessed = mysteryPlayerById(guessId);
  pushHistory(s, {
    askerId: playerId,
    type: 'guess',
    label: `Final guess: ${guessed?.name ?? 'Unknown'}`,
    answer: correct,
  });

  if (correct) {
    recordRoundWin(s, playerId);
    return s;
  }

  s.wrongGuesses[playerId] += 1;
  switch (state.settings.penalty) {
    case 'instant_loss':
      recordRoundWin(s, oppId);
      break;
    case 'lose_turn':
      s.turn = oppId;
      break;
    case 'free_question':
      s.turn = oppId;
      s.bonusFor = oppId;
      break;
    case 'none':
    default:
      break; // turn stays with the guesser
  }
  return s;
}

/** Timer expiry / manual skip: the current player forfeits their turn. */
export function skipTurn(state: MysteryState, playerId: string): MysteryState {
  if (state.phase !== 'active' || state.turn !== playerId) return state;
  const s = clone(state);
  s.bonusFor = null;
  s.turn = opponentOf(s, playerId);
  return s;
}

/** Start the next round of a Best-of series (fresh secret picks). */
export function nextRound(state: MysteryState): MysteryState {
  if (state.phase !== 'round_over') return state;
  const s = clone(state);
  s.phase = 'selecting';
  s.roundNumber += 1;
  for (const p of state.players) {
    s.secret[p.id] = null;
    s.locked[p.id] = false;
    s.commit[p.id] = '';
    s.knowledge[p.id] = [];
    s.questionsAsked[p.id] = 0;
    s.wrongGuesses[p.id] = 0;
  }
  s.history = [];
  s.pendingFree = null;
  s.bonusFor = null;
  s.roundWinner = null;
  s.turn = state.players[0].id;
  return s;
}
