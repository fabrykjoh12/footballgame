import { describe, it, expect } from 'vitest';
import {
  reconcileProgress,
  isEmptyProgress,
  type ProgressSnapshot,
} from './progress';

const snap = (p: Partial<ProgressSnapshot>): ProgressSnapshot => ({
  career: null,
  profile: null,
  daily: null,
  ...p,
});

describe('isEmptyProgress', () => {
  it('is true only when every blob is null', () => {
    expect(isEmptyProgress(snap({}))).toBe(true);
    expect(isEmptyProgress(snap({ profile: { wins: 1 } }))).toBe(false);
  });
});

describe('reconcileProgress', () => {
  it('keeps local and flags a push when remote is empty (first sign-in)', () => {
    const local = snap({ career: { tier: 4 }, profile: { wins: 3 } });
    const { result, shouldPush } = reconcileProgress(local, null);
    expect(result).toEqual(local);
    expect(shouldPush).toBe(true);
  });

  it('prefers remote per blob, but fills gaps from local', () => {
    const local = snap({ career: { tier: 4 }, daily: { streak: 2 } });
    const remote = snap({ career: { tier: 1 }, profile: { wins: 9 } });
    const { result, shouldPush } = reconcileProgress(local, remote);
    expect(result.career).toEqual({ tier: 1 }); // remote wins
    expect(result.profile).toEqual({ wins: 9 }); // remote-only
    expect(result.daily).toEqual({ streak: 2 }); // local fills the gap
    expect(shouldPush).toBe(true); // result added daily that remote lacked
  });

  it('does not push when remote already covers everything', () => {
    const local = snap({ career: { tier: 4 } });
    const remote = snap({ career: { tier: 1 }, profile: { wins: 9 }, daily: { streak: 5 } });
    const { result, shouldPush } = reconcileProgress(local, remote);
    expect(result).toEqual(remote);
    expect(shouldPush).toBe(false);
  });

  it('treats a missing remote like an empty one', () => {
    const local = snap({ profile: { wins: 1 } });
    expect(reconcileProgress(local, null).result).toEqual(local);
  });
});
