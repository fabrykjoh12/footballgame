import { describe, it, expect } from 'vitest';
import {
  createCareer,
  currentFixture,
  computeStandings,
  recordYourMatch,
  startNextSeason,
  roundRobin,
  careerMatchSettings,
  divisionByTier,
  yourPosition,
  ROUNDS_PER_SEASON,
  TEAMS_PER_DIVISION,
  TOP_TIER,
  BOTTOM_TIER,
  YOU_ID,
  type CareerState,
} from './career';

describe('roundRobin schedule', () => {
  it('plays every pair exactly once and nobody twice in a round', () => {
    const ids = ['a', 'b', 'c', 'd', 'e', 'f'];
    const rounds = roundRobin(ids);
    expect(rounds).toHaveLength(ids.length - 1);

    const seen = new Set<string>();
    for (const round of rounds) {
      expect(round).toHaveLength(ids.length / 2);
      const inRound = new Set<string>();
      for (const [home, away] of round) {
        expect(home).not.toBe(away);
        for (const t of [home, away]) {
          expect(inRound.has(t), `${t} twice in a round`).toBe(false);
          inRound.add(t);
        }
        const key = [home, away].sort().join('-');
        expect(seen.has(key), `pair ${key} repeated`).toBe(false);
        seen.add(key);
      }
    }
    // 6 teams → 15 unique pairings.
    expect(seen.size).toBe(15);
  });
});

describe('createCareer', () => {
  it('starts in the bottom division with a full fixture list', () => {
    const c = createCareer('Sara', 123);
    expect(c.tier).toBe(BOTTOM_TIER);
    expect(c.season).toBe(1);
    expect(c.teams).toHaveLength(TEAMS_PER_DIVISION);
    expect(c.teams.filter((t) => t.isYou)).toHaveLength(1);
    expect(c.schedule).toHaveLength(ROUNDS_PER_SEASON);
    expect(c.round).toBe(0);
    expect(c.status).toBe('in_season');
  });

  it('is deterministic for the same seed', () => {
    const a = createCareer('Sara', 99);
    const b = createCareer('Sara', 99);
    expect(a.teams.map((t) => t.name)).toEqual(b.teams.map((t) => t.name));
    expect(a.schedule).toEqual(b.schedule);
  });

  it('uses the manager name for your team', () => {
    const c = createCareer('Jonas', 7);
    expect(c.teams.find((t) => t.isYou)?.name).toBe('Jonas');
  });
});

describe('currentFixture', () => {
  it('always pairs you with a real rival each round', () => {
    let c = createCareer('Sara', 42);
    const opponents = new Set<string>();
    for (let r = 0; r < ROUNDS_PER_SEASON; r++) {
      const fx = currentFixture(c);
      expect(fx).not.toBeNull();
      expect(fx!.opponent.id).not.toBe(YOU_ID);
      opponents.add(fx!.opponent.id);
      c = recordYourMatch(c, { yourGoals: 2, oppGoals: 1, sig: `r${r}` });
    }
    // You face all five rivals across a season.
    expect(opponents.size).toBe(ROUNDS_PER_SEASON);
    expect(currentFixture(c)).toBeNull();
  });
});

describe('recordYourMatch', () => {
  it('records your scoreline and simulates the rest of the round', () => {
    const c = createCareer('Sara', 5);
    const fx = currentFixture(c)!;
    const next = recordYourMatch(c, { yourGoals: 3, oppGoals: 0, sig: 'm1' });
    expect(next.round).toBe(1);
    expect(next.results[0]).toHaveLength(TEAMS_PER_DIVISION / 2);

    const table = computeStandings(next);
    const you = table.find((r) => r.team.isYou)!;
    expect(you.played).toBe(1);
    expect(you.goalsFor).toBe(3);
    expect(you.goalsAgainst).toBe(0);
    expect(you.points).toBe(3);

    const opp = table.find((r) => r.team.id === fx.opponent.id)!;
    expect(opp.played).toBe(1);
    expect(opp.points).toBe(0);
  });

  it('is idempotent for the same match signature', () => {
    const c = createCareer('Sara', 5);
    const once = recordYourMatch(c, { yourGoals: 1, oppGoals: 1, sig: 'same' });
    const twice = recordYourMatch(once, { yourGoals: 1, oppGoals: 1, sig: 'same' });
    expect(twice).toBe(once);
    expect(twice.round).toBe(1);
  });

  it('simulates the same rival results for the same seed + round', () => {
    const a = recordYourMatch(createCareer('Sara', 77), {
      yourGoals: 0,
      oppGoals: 0,
      sig: 'x',
    });
    const b = recordYourMatch(createCareer('Sara', 77), {
      yourGoals: 0,
      oppGoals: 0,
      sig: 'x',
    });
    expect(a.results[0]).toEqual(b.results[0]);
  });
});

/** Play a whole season winning every game 5–0 so you finish top. */
function dominateSeason(state: CareerState): CareerState {
  let c = state;
  for (let r = 0; r < ROUNDS_PER_SEASON; r++) {
    c = recordYourMatch(c, { yourGoals: 5, oppGoals: 0, sig: `win-${c.season}-${r}` });
  }
  return c;
}

describe('season completion + promotion', () => {
  it('promotes you and moves up a division when you finish top', () => {
    const done = dominateSeason(createCareer('Sara', 11));
    expect(done.round).toBe(ROUNDS_PER_SEASON);
    expect(done.status).toBe('season_complete');
    expect(yourPosition(done)).toBe(1);
    expect(done.lastOutcome?.promoted).toBe(true);
    expect(done.lastOutcome?.toTier).toBe(BOTTOM_TIER - 1);
    expect(done.trophies.length).toBeGreaterThanOrEqual(1);

    const nextSeason = startNextSeason(done);
    expect(nextSeason.tier).toBe(BOTTOM_TIER - 1);
    expect(nextSeason.season).toBe(2);
    expect(nextSeason.round).toBe(0);
    expect(nextSeason.results).toHaveLength(0);
    expect(nextSeason.status).toBe('in_season');
  });

  it('marks the career complete when you win the top flight', () => {
    // Force a career sitting in the top tier, then win it.
    let c = createCareer('Sara', 3);
    c = { ...c, tier: TOP_TIER };
    c = dominateSeason(c);
    expect(c.lastOutcome?.wonTitle).toBe(true);
    expect(c.status).toBe('career_complete');
  });
});

describe('careerMatchSettings + divisions', () => {
  it('maps each tier to a harder mode as you climb', () => {
    expect(divisionByTier(BOTTOM_TIER).mode).toBe('casual');
    expect(divisionByTier(TOP_TIER).mode).toBe('nightmare');

    const s = careerMatchSettings(createCareer('Sara', 1));
    expect(s.careerMatch).toBe(true);
    expect(s.questionCount).toBe(10);
    expect(s.mode).toBe('casual');
  });
});
