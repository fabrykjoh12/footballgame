import { describe, it, expect } from 'vitest';
import { PLAYERS } from '../../data/players';
import { categoryMembers, scoutCategoryById } from '../scout/categories';
import {
  initRondoSync,
  addRondoGuest,
  applyRondoAction,
  pickRondoCategoryId,
  sideOf,
  bothPresent,
  RONDO_ONLINE_TARGET,
  RONDO_TURN_MS,
  type RondoSyncState,
} from './online';

const HOST = { id: 'h', name: 'Host' };
const GUEST = { id: 'g', name: 'Guest' };
const SEED = 12345;

function seated(now = 1000): RondoSyncState {
  return addRondoGuest(initRondoSync(HOST, SEED), GUEST, now);
}

/** A valid, unused, fitting player for the current rally. */
function pick(state: RondoSyncState): string {
  const cat = scoutCategoryById(state.match!.rally.categoryId)!;
  const used = new Set(state.match!.rally.usedIds);
  const m = categoryMembers(cat, PLAYERS).find((p) => !used.has(p.id));
  if (!m) throw new Error('category exhausted in test');
  return m.id;
}

describe('rondo online — setup', () => {
  it('seats host as A and, once the guest joins, auto-starts a match with a deadline', () => {
    const s0 = initRondoSync(HOST, SEED);
    expect(s0.match).toBeNull();
    expect(bothPresent(s0)).toBe(false);

    const s1 = addRondoGuest(s0, GUEST, 1000);
    expect(bothPresent(s1)).toBe(true);
    expect(sideOf(s1, 'h')).toBe('A');
    expect(sideOf(s1, 'g')).toBe('B');
    expect(s1.match).not.toBeNull();
    expect(s1.match!.rally.server).toBe('A');
    expect(s1.turnDeadline).toBe(1000 + RONDO_TURN_MS);
  });

  it('adding a third player or a duplicate is a no-op', () => {
    const s = seated();
    expect(addRondoGuest(s, { id: 'x', name: 'X' }, 2000)).toBe(s);
    expect(addRondoGuest(s, GUEST, 2000)).toBe(s);
  });

  it('picks the same shared category for a seed + index', () => {
    expect(pickRondoCategoryId(SEED, 3).id).toBe(pickRondoCategoryId(SEED, 3).id);
  });
});

describe('rondo online — actions', () => {
  it('a valid name passes the turn and re-arms the deadline', () => {
    const s = seated(1000);
    const next = applyRondoAction(s, { kind: 'name', playerId: 'h', targetId: pick(s) }, 5000);
    expect(next.match!.rally.turn).toBe('B');
    expect(next.match!.rally.named).toHaveLength(1);
    expect(next.turnDeadline).toBe(5000 + RONDO_TURN_MS);
  });

  it('ignores an action from an unknown player, or out of turn', () => {
    const s = seated();
    expect(applyRondoAction(s, { kind: 'name', playerId: 'nobody', targetId: pick(s) }, 5000)).toBe(s);
    // It is A's turn; B naming is a no-op.
    expect(applyRondoAction(s, { kind: 'name', playerId: 'g', targetId: pick(s) }, 5000)).toBe(s);
  });

  it('a wrong name hands the rally (and a goal) to the opponent', () => {
    const s = seated(1000);
    // Find a player who does NOT fit the current category.
    const cat = scoutCategoryById(s.match!.rally.categoryId)!;
    const misfit = PLAYERS.find((p) => !cat.test(p))!;
    const next = applyRondoAction(s, { kind: 'name', playerId: 'h', targetId: misfit.id }, 6000);
    expect(next.match!.scores).toEqual({ A: 0, B: 1 }); // A lost the rally
    expect(next.rallyIndex).toBe(s.rallyIndex + 1); // a fresh rally started
  });

  it('ignores a timeout before the deadline, honours it after', () => {
    const s = seated(1000); // deadline = 1000 + 15000 = 16000
    expect(applyRondoAction(s, { kind: 'timeout', playerId: 'g' }, 10000)).toBe(s);
    const after = applyRondoAction(s, { kind: 'timeout', playerId: 'g' }, 16001);
    // A was on the clock and timed out → B scores.
    expect(after.match!.scores).toEqual({ A: 0, B: 1 });
  });
});

describe('rondo online — a full two-player match reaches a winner', () => {
  it('drives valid names + timeouts to a decisive score', () => {
    let s = seated(0);
    let now = 0;
    let guard = 0;

    while (s.match!.phase === 'playing' && guard++ < 4000) {
      const turn = s.match!.rally.turn;
      const pid = turn === 'A' ? 'h' : 'g';
      now += 3000;
      // Occasionally let the clock run out to force turnovers and goals.
      if (guard % 5 === 0) {
        now = (s.turnDeadline ?? now) + 1;
        s = applyRondoAction(s, { kind: 'timeout', playerId: pid }, now);
      } else {
        s = applyRondoAction(s, { kind: 'name', playerId: pid, targetId: pick(s) }, now);
      }
    }

    expect(s.match!.phase).toBe('over');
    expect(s.match!.winner === 'A' || s.match!.winner === 'B').toBe(true);
    expect(Math.max(s.match!.scores.A, s.match!.scores.B)).toBe(RONDO_ONLINE_TARGET);
    expect(s.turnDeadline).toBeNull(); // clock stops when the match ends
  });

  it('rematch flips the server and starts a fresh match', () => {
    // Fast-path a finished match: 3 timeouts against whoever is on the clock.
    let s = seated(0);
    let now = 0;
    while (s.match!.phase === 'playing') {
      now = (s.turnDeadline ?? now) + 1;
      const pid = s.match!.rally.turn === 'A' ? 'h' : 'g';
      s = applyRondoAction(s, { kind: 'timeout', playerId: pid }, now);
    }
    expect(s.match!.phase).toBe('over');
    const before = s.firstServe;
    const r = applyRondoAction(s, { kind: 'rematch', playerId: 'h' }, now + 100);
    expect(r.match!.phase).toBe('playing');
    expect(r.firstServe).toBe(before === 'A' ? 'B' : 'A');
    expect(r.match!.rally.server).toBe(r.firstServe);
  });
});
