import { describe, it, expect } from 'vitest';
import {
  generateLeagueCode,
  normalizeLeagueCode,
  isValidLeagueCode,
  computeStandings,
  type LeagueMember,
  type LeagueResult,
} from './leagues';

describe('league codes', () => {
  it('generates valid codes', () => {
    for (let i = 0; i < 50; i++) expect(isValidLeagueCode(generateLeagueCode())).toBe(true);
  });

  it('normalises and validates', () => {
    expect(normalizeLeagueCode(' lg-7q2-k9 ')).toBe('LG7Q2K9');
    expect(isValidLeagueCode('LG7Q2K9')).toBe(true);
    expect(isValidLeagueCode('LG7Q2')).toBe(false); // too short
    expect(isValidLeagueCode('XX7Q2K9')).toBe(false); // wrong prefix
  });
});

const members: LeagueMember[] = [
  { uid: 'a', name: 'Sara' },
  { uid: 'b', name: 'Jonas' },
  { uid: 'c', name: 'Mia' },
];

function r(uid: string, key: string, points: number): LeagueResult {
  return { uid, key, points, at: 0 };
}

describe('computeStandings', () => {
  it('includes every member, even with no results', () => {
    const rows = computeStandings(members, []);
    expect(rows).toHaveLength(3);
    expect(rows.every((row) => row.played === 0 && row.points === 0)).toBe(true);
  });

  it('sums points and counts distinct days played', () => {
    const rows = computeStandings(members, [
      r('a', '2026-06-01', 1000),
      r('a', '2026-06-02', 1500),
      r('b', '2026-06-01', 800),
    ]);
    const sara = rows.find((x) => x.uid === 'a')!;
    expect(sara.points).toBe(2500);
    expect(sara.played).toBe(2);
    expect(sara.best).toBe(1500);
  });

  it('ranks by points desc and assigns positions', () => {
    const rows = computeStandings(members, [
      r('a', 'd1', 1000),
      r('b', 'd1', 3000),
      r('c', 'd1', 2000),
    ]);
    expect(rows.map((x) => x.uid)).toEqual(['b', 'c', 'a']);
    expect(rows.map((x) => x.rank)).toEqual([1, 2, 3]);
  });

  it('de-dupes the same day, keeping the higher score', () => {
    const rows = computeStandings(members, [
      r('a', '2026-06-01', 1000),
      r('a', '2026-06-01', 1800), // replayed the same daily; keep the best
    ]);
    const sara = rows.find((x) => x.uid === 'a')!;
    expect(sara.points).toBe(1800);
    expect(sara.played).toBe(1);
  });

  it('breaks point ties on best single result', () => {
    const rows = computeStandings(
      [
        { uid: 'a', name: 'Sara' },
        { uid: 'b', name: 'Jonas' },
      ],
      [
        r('a', 'd1', 500),
        r('a', 'd2', 500), // total 1000, best 500
        r('b', 'd1', 1000), // total 1000, best 1000
      ],
    );
    expect(rows[0].uid).toBe('b'); // higher best wins the tie
    expect(rows.map((x) => x.rank)).toEqual([1, 2]);
  });

  it('shares a rank for a genuine dead heat, then skips', () => {
    const rows = computeStandings(
      [
        { uid: 'a', name: 'Aaron' },
        { uid: 'b', name: 'Bea' },
        { uid: 'c', name: 'Cara' },
      ],
      [
        r('a', 'd1', 1000),
        r('b', 'd1', 1000),
        r('c', 'd1', 500),
      ],
    );
    // a and b tie (same points + best) -> both rank 1; c -> rank 3.
    expect(rows.map((x) => x.rank)).toEqual([1, 1, 3]);
    expect(rows[0].name).toBe('Aaron'); // name breaks display order, not rank
    expect(rows[1].name).toBe('Bea');
  });
});
