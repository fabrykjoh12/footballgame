import { describe, it, expect } from 'vitest';
import type { Player } from '../playerDb';
import { PLAYERS } from '../../data/players';
import { scoutCategoryById, type ScoutCategory } from '../scout/categories';
import { rondoCatalog } from './daily';
import { cpuNameInRondo } from './cpu';
import { mulberry32 } from '../seededRandom';
import {
  startRondoRally,
  startRondoMatch,
  nameInRondo,
  timeoutRondo,
  concludeRally,
  nextRondoRally,
  otherRondoSide,
  rallyTally,
} from './engine';

function player(id: string, clubs: string[] = []): Player {
  return {
    id,
    name: id,
    aliases: [],
    nationality: 'England',
    continent: 'Europe',
    positions: ['midfielder'],
    primaryPosition: 'midfielder',
    clubs,
    leagues: [],
    debutYear: 2000,
    active: true,
    trophies: {
      championsLeague: false,
      ballonDor: false,
      worldCup: false,
      euros: false,
      copaAmerica: false,
      leagueTitle: false,
    },
    tags: [],
  };
}

// A test category: "played for Arsenal".
const arsenal: ScoutCategory = {
  id: 'club:Arsenal',
  label: 'Played for Arsenal',
  kind: 'club',
  test: (p) => p.clubs.includes('Arsenal'),
};

describe('rondo rally', () => {
  it('a valid unused fitting name keeps the ball and passes the turn', () => {
    const rally = startRondoRally('club:Arsenal', 'Played for Arsenal', 'A');
    const { rally: r, result } = nameInRondo(rally, 'A', player('saka', ['Arsenal']), arsenal);
    expect(result).toBe('ok');
    expect(r.turn).toBe('B');
    expect(r.usedIds).toEqual(['saka']);
    expect(r.phase).toBe('playing');
  });

  it('a name that does not fit the rule loses the rally', () => {
    const rally = startRondoRally('club:Arsenal', 'Played for Arsenal', 'A');
    const { rally: r, result } = nameInRondo(rally, 'A', player('kane', ['Tottenham Hotspur']), arsenal);
    expect(result).toBe('wrong');
    expect(r.phase).toBe('over');
    expect(r.loser).toBe('A');
    expect(r.reason).toBe('wrong');
  });

  it('naming an already-used player loses the rally', () => {
    let rally = startRondoRally('club:Arsenal', 'Played for Arsenal', 'A');
    rally = nameInRondo(rally, 'A', player('saka', ['Arsenal']), arsenal).rally;
    const { rally: r, result } = nameInRondo(rally, 'B', player('saka', ['Arsenal']), arsenal);
    expect(result).toBe('repeat');
    expect(r.phase).toBe('over');
    expect(r.loser).toBe('B');
  });

  it('rejects a move out of turn or after the rally is over', () => {
    const rally = startRondoRally('club:Arsenal', 'Played for Arsenal', 'A');
    expect(() => nameInRondo(rally, 'B', player('saka', ['Arsenal']), arsenal)).toThrow();
    const over = timeoutRondo(rally);
    expect(() => nameInRondo(over, 'B', player('x', ['Arsenal']), arsenal)).toThrow();
  });

  it('a timeout makes the side on the clock the loser', () => {
    const rally = startRondoRally('club:Arsenal', 'Played for Arsenal', 'B');
    const r = timeoutRondo(rally);
    expect(r.loser).toBe('B');
    expect(r.reason).toBe('timeout');
  });

  it('tallies each side\'s names', () => {
    let rally = startRondoRally('club:Arsenal', 'Played for Arsenal', 'A');
    rally = nameInRondo(rally, 'A', player('a', ['Arsenal']), arsenal).rally;
    rally = nameInRondo(rally, 'B', player('b', ['Arsenal']), arsenal).rally;
    rally = nameInRondo(rally, 'A', player('c', ['Arsenal']), arsenal).rally;
    expect(rallyTally(rally)).toEqual({ A: 2, B: 1 });
  });
});

describe('rondo match', () => {
  it('awards the rally winner and ends the match at the target', () => {
    const first = startRondoRally('club:Arsenal', 'Played for Arsenal', 'A');
    let match = startRondoMatch(2, first);

    // Rally 1: A is on the clock and times out → B scores.
    match = concludeRally(match, timeoutRondo(match.rally));
    expect(match.scores).toEqual({ A: 0, B: 1 });
    expect(match.phase).toBe('playing');

    // Next rally: server alternates from A to B.
    match = nextRondoRally(match, 'club:Arsenal', 'Played for Arsenal');
    expect(match.rally.server).toBe('B');
    expect(match.rallyNumber).toBe(2);

    // Rally 2: B passes (valid name) to A, then A times out → B reaches target.
    const passed = nameInRondo(match.rally, 'B', player('z', ['Arsenal']), arsenal).rally;
    match = concludeRally({ ...match, rally: passed }, timeoutRondo(passed));
    expect(match.scores).toEqual({ A: 0, B: 2 });
    expect(match.phase).toBe('over');
    expect(match.winner).toBe('B');
  });

  it('cannot conclude an unfinished rally or start a rally after the match ends', () => {
    const first = startRondoRally('c', 'l', 'A');
    let match = startRondoMatch(1, first);
    expect(() => concludeRally(match, first)).toThrow();
    match = concludeRally(match, timeoutRondo(first));
    expect(match.phase).toBe('over');
    expect(() => nextRondoRally(match, 'c', 'l')).toThrow();
  });

  it('otherRondoSide flips the side', () => {
    expect(otherRondoSide('A')).toBe('B');
    expect(otherRondoSide('B')).toBe('A');
  });
});

describe('rondo full-loop integration (drives the component reducer path)', () => {
  it('a CPU-vs-CPU match reaches a winner and never makes an illegal move', () => {
    const catalog = rondoCatalog();
    const cat0 = catalog[0];
    let match = startRondoMatch(3, startRondoRally(cat0.id, cat0.label, 'A'));
    const rng = mulberry32(20260717);
    let guard = 0;

    while (match.phase === 'playing' && guard++ < 2000) {
      const rally = match.rally;
      const category = scoutCategoryById(rally.categoryId)!;
      const pick = cpuNameInRondo(rally, category, PLAYERS, rng, 'pro');
      if (!pick) {
        match = concludeRally(match, timeoutRondo(rally));
      } else {
        const { rally: r, result } = nameInRondo(rally, rally.turn, pick, category);
        // The CPU must only ever produce valid, unused, fitting names.
        expect(result).toBe('ok');
        match = { ...match, rally: r };
      }
      if (match.phase === 'playing' && match.rally.phase === 'over') {
        const next = catalog[guard % catalog.length];
        match = nextRondoRally(match, next.id, next.label);
      }
    }

    expect(match.phase).toBe('over');
    expect(match.winner === 'A' || match.winner === 'B').toBe(true);
    expect(Math.max(match.scores.A, match.scores.B)).toBe(3);
  });
});
