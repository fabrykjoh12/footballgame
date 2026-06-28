import { describe, it, expect } from 'vitest';
import { punditVerdict, type PunditInput } from './punditry';

const base = (over: Partial<PunditInput> = {}): PunditInput => ({
  winnerName: 'Modock United',
  onPoints: false,
  goalDiff: 1,
  comeback: false,
  lateWinner: false,
  nightmare: false,
  ...over,
});

describe('punditVerdict', () => {
  it('gives a draw line when there is no winner', () => {
    const line = punditVerdict(base({ winnerName: null, goalDiff: 0 }));
    expect(line.toLowerCase()).toMatch(/even|split|nothing between/);
    expect(line).not.toContain('{w}');
  });

  it('prioritises a comeback over everything', () => {
    const line = punditVerdict(base({ comeback: true, goalDiff: 4, nightmare: true }));
    expect(line.toLowerCase()).toMatch(/turnaround|hole|brink|gear/);
    expect(line).toContain('Modock United');
  });

  it('calls out a late winner', () => {
    expect(punditVerdict(base({ lateWinner: true })).toLowerCase()).toMatch(/nerve|hour|death|last word/);
  });

  it('calls out a Nightmare win', () => {
    expect(punditVerdict(base({ nightmare: true })).toLowerCase()).toMatch(
      /nightmare|hardest setting|no margin/,
    );
  });

  it('calls a big margin a statement win', () => {
    expect(punditVerdict(base({ goalDiff: 4 })).toLowerCase()).toMatch(/statement|class|riot/);
  });

  it('notes a points decision', () => {
    expect(punditVerdict(base({ goalDiff: 0, onPoints: true })).toLowerCase()).toMatch(/win.s a win|margins|wire/);
  });

  it('is deterministic per seed and fills the winner name', () => {
    expect(punditVerdict(base(), 5)).toBe(punditVerdict(base(), 5));
    expect(punditVerdict(base({ goalDiff: 4 }), 1)).toContain('Modock United');
  });
});
