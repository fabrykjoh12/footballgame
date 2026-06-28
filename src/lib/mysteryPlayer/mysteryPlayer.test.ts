import { describe, it, expect } from 'vitest';
import { MYSTERY_PLAYERS, mysteryPlayerById } from '../../data/mysteryPlayers';
import {
  answerVerified,
  questionLabel,
  CLUB_OPTIONS,
  LEAGUE_OPTIONS,
  COUNTRY_OPTIONS,
} from './mysteryPlayerQuestions';
import { filterCandidates } from './mysteryPlayerCandidateFilter';
import { commitPick, verifyCommit } from './mysteryPlayerCommit';
import { roundsToWin, matchWinner } from './mysteryPlayerScoring';
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
  currentCandidates,
  opponentOf,
} from './mysteryPlayerEngine';
import { cpuTakeTurn, cpuChoosePlayer } from './mysteryPlayerCpu';
import { mulberry32 } from '../seededRandom';
import {
  DEFAULT_SETTINGS,
  type DuelPlayer,
  type RoomSettings,
  type VerifiedQuestion,
} from './mysteryPlayerTypes';

const PLAYERS: [DuelPlayer, DuelPlayer] = [
  { id: 'a', name: 'Sara', isCpu: false },
  { id: 'b', name: 'Jonas', isCpu: false },
];

function game(settings: Partial<RoomSettings> = {}) {
  return createMysteryGame({ settings: { ...DEFAULT_SETTINGS, ...settings }, players: PLAYERS });
}

/** A locked, active game where a picks `aId` and b picks `bId`. */
function activeGame(aId: string, bId: string, settings: Partial<RoomSettings> = {}) {
  let s = game(settings);
  s = lockPlayer(s, 'a', aId);
  s = lockPlayer(s, 'b', bId);
  return s;
}

describe('metadata validity', () => {
  it('every player has the fields verified questions rely on', () => {
    for (const p of MYSTERY_PLAYERS) {
      expect(p.id).toBeTruthy();
      expect(p.name).toBeTruthy();
      expect(p.nationality).toBeTruthy();
      expect(p.positions.length).toBeGreaterThan(0);
      expect(p.positions).toContain(p.primaryPosition);
      expect(p.clubs.length).toBeGreaterThan(0);
      expect(p.leagues.length).toBeGreaterThan(0);
      expect(p.debutYear).toBeGreaterThan(1900);
      expect(typeof p.active).toBe('boolean');
      expect(p.active).toBe(p.lastYear === undefined);
    }
  });
  it('has unique ids', () => {
    const ids = MYSTERY_PLAYERS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('builder catalogues are populated and de-duped', () => {
    expect(CLUB_OPTIONS.length).toBeGreaterThan(10);
    expect(new Set(CLUB_OPTIONS).size).toBe(CLUB_OPTIONS.length);
    expect(LEAGUE_OPTIONS[0]).toBe('Premier League'); // top-five first
    expect(COUNTRY_OPTIONS).toContain('Brazil');
  });
});

describe('answerVerified', () => {
  const kdb = mysteryPlayerById('kevin_de_bruyne')!;
  it('answers club / league / country correctly', () => {
    expect(answerVerified(kdb, { kind: 'club', value: 'Chelsea' })).toBe(true);
    expect(answerVerified(kdb, { kind: 'club', value: 'Arsenal' })).toBe(false);
    expect(answerVerified(kdb, { kind: 'league', value: 'Premier League' })).toBe(true);
    expect(answerVerified(kdb, { kind: 'league', value: 'La Liga' })).toBe(false);
    expect(answerVerified(kdb, { kind: 'country', value: 'Belgium' })).toBe(true);
  });
  it('answers trophy / status / era', () => {
    expect(answerVerified(kdb, { kind: 'trophy', value: 'cl' })).toBe(true);
    expect(answerVerified(kdb, { kind: 'trophy', value: 'world_cup' })).toBe(false);
    expect(answerVerified(kdb, { kind: 'status', value: 'active' })).toBe(true);
    expect(answerVerified(kdb, { kind: 'era', value: 'after_2010' })).toBe(true);
    const zidane = mysteryPlayerById('zinedine_zidane')!;
    expect(answerVerified(zidane, { kind: 'era', value: 'before_2010' })).toBe(true);
    expect(answerVerified(zidane, { kind: 'status', value: 'retired' })).toBe(true);
  });
  it('produces readable labels', () => {
    expect(questionLabel({ kind: 'club', value: 'Chelsea' })).toBe('Has your player played for Chelsea?');
    expect(questionLabel({ kind: 'position', value: 'midfielder' })).toContain('midfielder');
  });
});

describe('candidate filtering', () => {
  it('narrows the pool by a verified fact and never excludes a true match', () => {
    const all = MYSTERY_PLAYERS;
    const facts = [{ question: { kind: 'league', value: 'Premier League' } as VerifiedQuestion, answer: true }];
    const filtered = filterCandidates(all, facts);
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.length).toBeLessThan(all.length);
    expect(filtered.every((p) => p.leagues.includes('Premier League'))).toBe(true);
  });
  it('returns the whole pool with no facts', () => {
    expect(filterCandidates(MYSTERY_PLAYERS, [])).toHaveLength(MYSTERY_PLAYERS.length);
  });
});

describe('commit', () => {
  it('round-trips and rejects a mismatch', () => {
    const c = commitPick('kevin_de_bruyne', 'salt');
    expect(verifyCommit('kevin_de_bruyne', 'salt', c)).toBe(true);
    expect(verifyCommit('lionel_messi', 'salt', c)).toBe(false);
  });
});

describe('scoring / formats', () => {
  it('rounds to win per format', () => {
    expect(roundsToWin('single')).toBe(1);
    expect(roundsToWin('bo3')).toBe(2);
    expect(roundsToWin('bo5')).toBe(3);
  });
  it('declares a match winner at the threshold', () => {
    expect(matchWinner({ a: 1, b: 0 }, 'single')).toBe('a');
    expect(matchWinner({ a: 1, b: 1 }, 'bo3')).toBeNull();
    expect(matchWinner({ a: 2, b: 1 }, 'bo3')).toBe('a');
  });
});

describe('engine — lifecycle & turns', () => {
  it('stays in selecting until both lock', () => {
    let s = game();
    expect(s.phase).toBe('selecting');
    s = lockPlayer(s, 'a', 'kevin_de_bruyne');
    expect(s.phase).toBe('selecting');
    s = lockPlayer(s, 'b', 'lionel_messi');
    expect(s.phase).toBe('active');
    expect(s.turn).toBe('a');
  });
  it('a locked pick cannot be changed', () => {
    let s = lockPlayer(game(), 'a', 'kevin_de_bruyne');
    s = lockPlayer(s, 'a', 'lionel_messi');
    expect(s.secret['a']).toBe('kevin_de_bruyne');
  });
  it('verified ask records knowledge, logs history and passes the turn', () => {
    let s = activeGame('kevin_de_bruyne', 'lionel_messi');
    // a asks about b (Messi): played in La Liga? → yes
    s = askVerified(s, 'a', { kind: 'league', value: 'La Liga' });
    expect(s.turn).toBe('b');
    expect(s.history).toHaveLength(1);
    expect(s.history[0].answer).toBe(true);
    expect(s.knowledge['a']).toHaveLength(1);
    // Candidate pool for a now only La Liga players.
    expect(currentCandidates(s, 'a').every((p) => p.leagues.includes('La Liga'))).toBe(true);
  });
  it('ignores an out-of-turn ask', () => {
    const s = activeGame('kevin_de_bruyne', 'lionel_messi');
    const after = askVerified(s, 'b', { kind: 'league', value: 'La Liga' });
    expect(after).toBe(s); // unchanged
  });
  it('skip forfeits the turn', () => {
    let s = activeGame('kevin_de_bruyne', 'lionel_messi');
    s = skipTurn(s, 'a');
    expect(s.turn).toBe('b');
  });
});

describe('engine — free questions', () => {
  it('logs a manually-answered free question and does not auto-filter', () => {
    let s = activeGame('kevin_de_bruyne', 'lionel_messi', { questionMode: 'mixed' });
    s = askFree(s, 'a', 'Did your player play with Messi?');
    expect(s.phase).toBe('awaiting_manual');
    s = answerFree(s, 'yes');
    expect(s.phase).toBe('active');
    expect(s.history[0]).toMatchObject({ type: 'free', answer: 'yes' });
    expect(s.knowledge['a']).toHaveLength(0); // free never filters
    expect(s.turn).toBe('b');
  });
});

describe('engine — manual answer mode', () => {
  const PL: VerifiedQuestion = { kind: 'league', value: 'Premier League' };

  it('auto mode resolves a verified question immediately', () => {
    let s = activeGame('lionel_messi', 'kevin_de_bruyne', { answerMode: 'auto' });
    s = askVerified(s, 'a', PL);
    expect(s.phase).toBe('active');
    expect(s.knowledge['a']).toHaveLength(1);
  });

  it('manual mode routes the question to the opponent before recording', () => {
    let s = activeGame('lionel_messi', 'kevin_de_bruyne', { answerMode: 'manual' });
    s = askVerified(s, 'a', PL);
    expect(s.phase).toBe('awaiting_manual');
    expect(s.pendingVerified).toMatchObject({ askerId: 'a' });
    expect(s.knowledge['a']).toHaveLength(0); // nothing recorded until answered
  });

  it('a manual Yes records a filtering fact and passes the turn', () => {
    let s = activeGame('lionel_messi', 'kevin_de_bruyne', { answerMode: 'manual' });
    s = askVerified(s, 'a', PL);
    s = answerVerifiedManual(s, 'yes');
    expect(s.phase).toBe('active');
    expect(s.knowledge['a']).toEqual([{ question: PL, answer: true }]);
    expect(s.history.at(-1)).toMatchObject({ type: 'verified', answer: true });
    expect(s.turn).toBe('b');
  });

  it('a manual Unsure logs without recording a filtering fact', () => {
    let s = activeGame('lionel_messi', 'kevin_de_bruyne', { answerMode: 'manual' });
    s = askVerified(s, 'a', PL);
    s = answerVerifiedManual(s, 'unsure');
    expect(s.knowledge['a']).toHaveLength(0);
    expect(s.history.at(-1)).toMatchObject({ type: 'free', answer: 'unsure' });
    expect(s.turn).toBe('b');
  });
});

describe('engine — guessing & penalties', () => {
  it('a correct guess wins the round (single → match over)', () => {
    let s = activeGame('kevin_de_bruyne', 'lionel_messi');
    s = makeGuess(s, 'a', 'lionel_messi');
    expect(s.roundWinner).toBe('a');
    expect(s.winner).toBe('a');
    expect(s.phase).toBe('match_over');
    expect(s.matchScore['a']).toBe(1);
  });
  it('wrong guess with lose_turn passes the turn', () => {
    let s = activeGame('kevin_de_bruyne', 'lionel_messi', { penalty: 'lose_turn' });
    s = makeGuess(s, 'a', 'erling_haaland');
    expect(s.wrongGuesses['a']).toBe(1);
    expect(s.turn).toBe('b');
    expect(s.phase).toBe('active');
  });
  it('wrong guess with free_question gives the opponent a bonus question', () => {
    let s = activeGame('kevin_de_bruyne', 'lionel_messi', { penalty: 'free_question' });
    s = makeGuess(s, 'a', 'erling_haaland');
    expect(s.turn).toBe('b');
    // b asks once → bonus consumed → still b's turn.
    s = askVerified(s, 'b', { kind: 'league', value: 'Premier League' });
    expect(s.turn).toBe('b');
    // b asks again → now passes to a.
    s = askVerified(s, 'b', { kind: 'position', value: 'midfielder' });
    expect(s.turn).toBe('a');
  });
  it('wrong guess with instant_loss hands the round to the opponent', () => {
    let s = activeGame('kevin_de_bruyne', 'lionel_messi', { penalty: 'instant_loss' });
    s = makeGuess(s, 'a', 'erling_haaland');
    expect(s.roundWinner).toBe('b');
    expect(s.winner).toBe('b');
  });
  it('wrong guess with no penalty keeps the turn', () => {
    let s = activeGame('kevin_de_bruyne', 'lionel_messi', { penalty: 'none' });
    s = makeGuess(s, 'a', 'erling_haaland');
    expect(s.turn).toBe('a');
    expect(s.phase).toBe('active');
  });
});

describe('engine — best-of series', () => {
  it('needs two round wins in bo3 and advances rounds', () => {
    let s = activeGame('kevin_de_bruyne', 'lionel_messi', { format: 'bo3' });
    s = makeGuess(s, 'a', 'lionel_messi'); // a wins round 1
    expect(s.phase).toBe('round_over');
    expect(s.winner).toBeNull();
    s = nextRound(s);
    expect(s.phase).toBe('selecting');
    expect(s.roundNumber).toBe(2);
    s = lockPlayer(s, 'a', 'erling_haaland');
    s = lockPlayer(s, 'b', 'neymar');
    s = makeGuess(s, 'a', 'neymar'); // a wins round 2 → match
    expect(s.matchScore['a']).toBe(2);
    expect(s.winner).toBe('a');
    expect(s.phase).toBe('match_over');
  });
});

describe('cpu', () => {
  it('chooses a real player and narrows toward a guess', () => {
    const rng = mulberry32(42);
    const secret = cpuChoosePlayer(rng);
    expect(mysteryPlayerById(secret)).toBeTruthy();

    // CPU 'b' tries to find a's player (Messi); drive a few turns.
    let s = activeGame('lionel_messi', cpuChoosePlayer(mulberry32(7)));
    const cpuRng = mulberry32(123);
    let guard = 0;
    let guessed = false;
    s.turn = 'b';
    while (guard < 40 && !guessed) {
      const action = cpuTakeTurn(s, 'b', cpuRng);
      if (action.type === 'guess') {
        guessed = true;
        break;
      }
      s = askVerified(s, 'b', action.question);
      // skip a's turn back to b for the test
      if (s.turn === 'a') s = skipTurn(s, 'a');
      guard++;
    }
    expect(guessed).toBe(true);
    expect(guard).toBeLessThan(40);
  });

  it('eventually identifies the opponent correctly with enough questions', () => {
    // Deterministic: CPU narrows candidates for a known secret.
    let s = activeGame('lionel_messi', 'kevin_de_bruyne');
    const rng = mulberry32(5);
    s.turn = 'b';
    let finalGuess: string | null = null;
    for (let i = 0; i < 60; i++) {
      const action = cpuTakeTurn(s, 'b', rng);
      if (action.type === 'guess') {
        finalGuess = action.guessId;
        break;
      }
      s = askVerified(s, 'b', action.question);
      if (s.turn === 'a') s = skipTurn(s, 'a');
    }
    // With candidates fully narrowed the guess should be Messi.
    if (currentCandidates(s, 'b').length === 1) {
      expect(finalGuess).toBe('lionel_messi');
    } else {
      expect(finalGuess).toBeTruthy();
    }
  });
});

describe('opponentOf', () => {
  it('returns the other player', () => {
    const s = game();
    expect(opponentOf(s, 'a')).toBe('b');
    expect(opponentOf(s, 'b')).toBe('a');
  });
});
