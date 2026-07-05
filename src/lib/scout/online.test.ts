import { describe, it, expect } from 'vitest';
import {
  initScoutSync,
  addScoutGuest,
  applyScoutAction,
  redactScoutState,
  localScoutView,
  sideOf,
  bothLocked,
  isRevealed,
} from './online';
import { scoutCatalog } from './categories';
import { PLAYERS } from '../../data/players';

const CATALOG = scoutCatalog();
const HOST = { id: 'host', name: 'Sara' };
const GUEST = { id: 'guest', name: 'Jonas' };

function seated() {
  return addScoutGuest(initScoutSync(HOST), GUEST);
}

/** A category id that a specific player fits (for a deterministic probe). */
function ruleFor(player = PLAYERS[0]) {
  const cat = CATALOG.find((c) => c.test(player) && CATALOG.filter((d) => d.test(player)).length > 0);
  return cat!.id;
}

describe('scout online sync', () => {
  it('seats host as A and guest as B', () => {
    const s = seated();
    expect(sideOf(s, 'host')).toBe('A');
    expect(sideOf(s, 'guest')).toBe('B');
    expect(addScoutGuest(s, { id: 'third', name: 'X' }).players).toHaveLength(2); // no third seat
  });

  it('starts the round only once both sides lock a secret', () => {
    let s = seated();
    const rA = CATALOG[0].id;
    const rB = CATALOG[1].id;
    s = applyScoutAction(s, { kind: 'lock', playerId: 'host', categoryId: rA }, CATALOG);
    expect(bothLocked(s)).toBe(false);
    expect(s.round).toBeNull();
    s = applyScoutAction(s, { kind: 'lock', playerId: 'guest', categoryId: rB }, CATALOG);
    expect(bothLocked(s)).toBe(true);
    expect(s.round).not.toBeNull();
    expect(s.round!.turn).toBe('A');
  });

  it('ignores a probe that is out of turn (no crash, same ref)', () => {
    let s = seated();
    s = applyScoutAction(s, { kind: 'lock', playerId: 'host', categoryId: CATALOG[0].id }, CATALOG);
    s = applyScoutAction(s, { kind: 'lock', playerId: 'guest', categoryId: CATALOG[1].id }, CATALOG);
    // It's A's (host) turn; a guest probe must be a no-op.
    const before = s;
    const after = applyScoutAction(s, { kind: 'probe', playerId: 'guest', targetId: PLAYERS[0].id }, CATALOG);
    expect(after).toBe(before);
  });

  it('applies a legal probe and passes the turn', () => {
    let s = seated();
    s = applyScoutAction(s, { kind: 'lock', playerId: 'host', categoryId: CATALOG[0].id }, CATALOG);
    s = applyScoutAction(s, { kind: 'lock', playerId: 'guest', categoryId: CATALOG[1].id }, CATALOG);
    s = applyScoutAction(s, { kind: 'probe', playerId: 'host', targetId: PLAYERS[0].id }, CATALOG);
    expect(s.round!.probes.A).toHaveLength(1);
    expect(s.round!.turn).toBe('B');
  });

  it('a correct accusation ends the round and reveals secrets', () => {
    let s = seated();
    const guestSecret = ruleFor(PLAYERS[0]);
    s = applyScoutAction(s, { kind: 'lock', playerId: 'host', categoryId: CATALOG[0].id }, CATALOG);
    s = applyScoutAction(s, { kind: 'lock', playerId: 'guest', categoryId: guestSecret }, CATALOG);
    // Host (A) accuses B's actual secret → win.
    s = applyScoutAction(s, { kind: 'accuse', playerId: 'host', categoryId: guestSecret }, CATALOG);
    expect(isRevealed(s)).toBe(true);
    expect(s.round!.winner).toBe('A');
  });

  it('redacts both secrets on the wire, and never leaks the opponent locally', () => {
    let s = seated();
    s = applyScoutAction(s, { kind: 'lock', playerId: 'host', categoryId: 'rule-a' }, CATALOG);
    s = applyScoutAction(s, { kind: 'lock', playerId: 'guest', categoryId: 'rule-b' }, CATALOG);
    const wire = redactScoutState(s);
    expect(wire.secrets.A).toBe('');
    expect(wire.secrets.B).toBe('');
    if (wire.round) expect(wire.round.secrets).toEqual({ A: '', B: '' });

    // The guest re-injects only its OWN secret; the host's stays hidden.
    const guestView = localScoutView(wire, 'B', 'rule-b');
    expect(guestView.secrets.B).toBe('rule-b');
    expect(guestView.secrets.A).toBe(''); // opponent secret never revealed mid-round
  });

  it('rematch resets and alternates who starts (only when the round is over)', () => {
    let s = seated();
    const guestSecret = ruleFor(PLAYERS[0]);
    s = applyScoutAction(s, { kind: 'lock', playerId: 'host', categoryId: CATALOG[0].id }, CATALOG);
    s = applyScoutAction(s, { kind: 'lock', playerId: 'guest', categoryId: guestSecret }, CATALOG);
    // rematch before the round is over is a no-op.
    expect(applyScoutAction(s, { kind: 'rematch', playerId: 'host' }, CATALOG)).toBe(s);
    s = applyScoutAction(s, { kind: 'accuse', playerId: 'host', categoryId: guestSecret }, CATALOG);
    const r = applyScoutAction(s, { kind: 'rematch', playerId: 'guest' }, CATALOG);
    expect(r.round).toBeNull();
    expect(r.locked).toEqual({ A: false, B: false });
    expect(r.firstTurn).toBe('B'); // alternated from 'A'
  });
});
