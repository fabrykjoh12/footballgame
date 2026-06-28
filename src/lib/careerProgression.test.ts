import { describe, it, expect } from 'vitest';
import {
  createCareer,
  recordYourMatch,
  currentFixture,
  YOU_ID,
  type CareerState,
} from './career';
import {
  rivalProfile,
  seasonRival,
  seasonObjectives,
  boardConfidence,
  managerReputation,
  resultVsRival,
  yourGoalsFor,
} from './careerProgression';

const SEED = 12345;

/** Play out a whole season with a fixed your-result each round. */
function playSeason(
  state: CareerState,
  perRound: (s: CareerState) => { yourGoals: number; oppGoals: number },
): CareerState {
  let s = state;
  let guard = 0;
  while (currentFixture(s) && guard < 10) {
    const { yourGoals, oppGoals } = perRound(s);
    s = recordYourMatch(s, { yourGoals, oppGoals, sig: `r${s.round}` });
    guard++;
  }
  return s;
}

describe('rivalProfile', () => {
  it('is deterministic and has distinct strong/weak categories', () => {
    const c = createCareer('Sara', SEED);
    const rival = c.teams.find((t) => !t.isYou)!;
    const a = rivalProfile(rival, c.seed);
    const b = rivalProfile(rival, c.seed);
    expect(a).toEqual(b);
    expect(a.strongestCategory).not.toBe(a.weakestCategory);
    expect(a.personality.length).toBeGreaterThan(0);
  });
});

describe('seasonRival', () => {
  it('returns a non-you club, stably', () => {
    const c = createCareer('Sara', SEED);
    const r1 = seasonRival(c);
    const r2 = seasonRival(c);
    expect(r1).not.toBeNull();
    expect(r1!.isYou).toBe(false);
    expect(r1!.id).toBe(r2!.id);
  });
});

describe('seasonObjectives', () => {
  it('sets a promotion objective outside the top flight', () => {
    const c = createCareer('Sara', SEED); // starts in League Two (bottom tier)
    const objs = seasonObjectives(c);
    expect(objs.find((o) => o.id === 'promotion')).toBeTruthy();
    // Mid-season everything is still pending.
    expect(objs.every((o) => o.status === 'pending')).toBe(true);
  });

  it('marks promotion met when you win every game', () => {
    let c = createCareer('Sara', SEED);
    c = playSeason(c, () => ({ yourGoals: 4, oppGoals: 0 }));
    const objs = seasonObjectives(c);
    const promo = objs.find((o) => o.id === 'promotion')!;
    expect(promo.status).toBe('met');
    const goals = objs.find((o) => o.id === 'goals')!;
    expect(goals.status).toBe('met');
  });

  it('fails promotion when you lose every game', () => {
    let c = createCareer('Sara', SEED);
    c = playSeason(c, () => ({ yourGoals: 0, oppGoals: 3 }));
    const objs = seasonObjectives(c);
    expect(objs.find((o) => o.id === 'promotion')!.status).toBe('failed');
  });

  it('tracks the beat-your-rival objective', () => {
    let c = createCareer('Sara', SEED);
    const rival = seasonRival(c)!;
    // Win every game → you beat the rival too.
    c = playSeason(c, () => ({ yourGoals: 3, oppGoals: 0 }));
    expect(resultVsRival(c, rival.id)).toBe('win');
    expect(seasonObjectives(c).find((o) => o.id === 'rival')!.status).toBe('met');
  });
});

describe('yourGoalsFor', () => {
  it('accumulates your scored goals', () => {
    let c = createCareer('Sara', SEED);
    c = recordYourMatch(c, { yourGoals: 2, oppGoals: 1, sig: 'r0' });
    expect(yourGoalsFor(c)).toBe(2);
  });
});

describe('boardConfidence', () => {
  it('is high after a winning run and low after losses', () => {
    let win = createCareer('Sara', SEED);
    win = playSeason(win, () => ({ yourGoals: 3, oppGoals: 0 }));
    let lose = createCareer('Sara', SEED);
    lose = playSeason(lose, () => ({ yourGoals: 0, oppGoals: 3 }));
    expect(boardConfidence(win).value).toBeGreaterThan(boardConfidence(lose).value);
    expect(boardConfidence(win).value).toBeGreaterThan(60);
    expect(boardConfidence(lose).value).toBeLessThan(40);
  });

  it('clamps to the 0–100 range with a label', () => {
    const c = createCareer('Sara', SEED);
    const bc = boardConfidence(c);
    expect(bc.value).toBeGreaterThanOrEqual(0);
    expect(bc.value).toBeLessThanOrEqual(100);
    expect(bc.label.length).toBeGreaterThan(0);
  });
});

describe('managerReputation', () => {
  it('starts as a rookie and grows with trophies', () => {
    const c = createCareer('Sara', SEED);
    expect(managerReputation(c).level).toBe(1);
    const decorated: CareerState = {
      ...c,
      trophies: Array.from({ length: 3 }, (_, i) => ({ label: 'X', season: i, tier: 1 })),
    };
    expect(managerReputation(decorated).points).toBeGreaterThan(managerReputation(c).points);
    expect(managerReputation(decorated).level).toBeGreaterThan(1);
  });
});

describe('relegation safety objective', () => {
  it('is absent in the bottom division', () => {
    const c = createCareer('Sara', SEED); // League Two = bottom tier
    expect(seasonObjectives(c).find((o) => o.id === 'safety')).toBeUndefined();
  });
  it('uses YOU_ID consistently for the home/away check', () => {
    let c = createCareer('Sara', SEED);
    c = recordYourMatch(c, { yourGoals: 1, oppGoals: 0, sig: 'r0' });
    // Your first opponent — result should be recorded against you, not unplayed.
    const firstOpp = c.teams.find((t) => t.id !== YOU_ID)!;
    // At least one rival now has a recorded H2H (whichever you faced).
    const anyPlayed = c.teams
      .filter((t) => t.id !== YOU_ID)
      .some((t) => resultVsRival(c, t.id) !== 'unplayed');
    expect(anyPlayed).toBe(true);
    expect(firstOpp).toBeTruthy();
  });
});
