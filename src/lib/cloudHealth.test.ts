import { describe, expect, it } from 'vitest';
import {
  runCloudHealth,
  remediationFor,
  selftestId,
  type CloudHealthBackend,
  type CloudHealthContext,
} from './cloudHealth';

const ctx: CloudHealthContext = {
  uid: 'u1',
  name: 'Sara',
  username: 'sara',
  friendCode: 'bk-abcde',
  progress: { career: { div: 1 }, profile: null, daily: null },
};

/** A backend where every path round-trips correctly. */
function passingBackend(): CloudHealthBackend {
  const invites: { id: string; fromUid: string; fromName: string; roomCode: string; createdAt: number }[] = [];
  const boards = new Map<string, { uid: string; name: string; score: number; updatedAt: number }[]>();
  const leagueResults = new Map<string, { uid: string; key: string; points: number; at: number }[]>();
  return {
    async pushProgress() {},
    async pullProgress() {
      return { career: { div: 1 }, profile: null, daily: null };
    },
    async publishProfile() {},
    async getUserProfile(uid) {
      return { uid, name: 'Sara', username: 'sara', friendCode: 'BK-ABCDE' };
    },
    async checkUsernameAvailable() {
      return false; // taken by self → correct
    },
    async searchUsersByUsername() {
      return [{ uid: 'u1', name: 'Sara', username: 'sara', friendCode: 'BK-ABCDE' }];
    },
    async resolveFriendCode() {
      return { uid: 'u1', name: 'Sara', username: 'sara', friendCode: 'BK-ABCDE' };
    },
    async sendInvite(toUid, inv) {
      invites.push({ id: `i${invites.length}`, createdAt: 0, ...inv });
    },
    watchInvites(_uid, cb) {
      // Deliver current inbox on the next tick, like a live snapshot.
      queueMicrotask(() => cb(invites.map((i) => ({ ...i }))));
      return () => {};
    },
    async clearInvite(_uid, id) {
      const idx = invites.findIndex((i) => i.id === id);
      if (idx >= 0) invites.splice(idx, 1);
    },
    async submitLeaderboardScore(board, entry) {
      boards.set(board, [...(boards.get(board) ?? []), { ...entry, updatedAt: 0 }]);
    },
    async fetchLeaderboard(board) {
      return boards.get(board) ?? [];
    },
    async createLeague() {},
    async submitLeagueResult(id, r) {
      leagueResults.set(id, [...(leagueResults.get(id) ?? []), r]);
    },
    async fetchLeagueResults(id) {
      return leagueResults.get(id) ?? [];
    },
  };
}

describe('runCloudHealth', () => {
  it('reports all-pass against a healthy backend', async () => {
    const report = await runCloudHealth(passingBackend(), ctx);
    expect(report.ok).toBe(true);
    expect(report.failed).toBe(0);
    expect(report.passed).toBe(report.results.length);
    // Every expected check id is present.
    expect(report.results.map((r) => r.id)).toEqual([
      'auth',
      'progress',
      'profile',
      'username',
      'friendcode',
      'invites',
      'leaderboard',
      'leagues',
    ]);
  });

  it('skips the username check when no username is claimed', async () => {
    const report = await runCloudHealth(passingBackend(), { ...ctx, username: null });
    const username = report.results.find((r) => r.id === 'username')!;
    expect(username.status).toBe('skip');
    expect(report.ok).toBe(true); // a skip is not a failure
    expect(report.skipped).toBe(1);
  });

  it('surfaces a permission-denied failure with the rules remediation', async () => {
    const be = passingBackend();
    be.getUserProfile = async () => {
      throw Object.assign(new Error('Missing or insufficient permissions.'), {
        code: 'permission-denied',
      });
    };
    const report = await runCloudHealth(be, ctx);
    const profile = report.results.find((r) => r.id === 'profile')!;
    expect(profile.status).toBe('fail');
    expect(profile.remediation).toMatch(/firestore\.rules/i);
    expect(report.ok).toBe(false);
  });

  it('flags a missing index as failed-precondition on username search', async () => {
    const be = passingBackend();
    be.searchUsersByUsername = async () => {
      throw Object.assign(new Error('The query requires an index.'), {
        code: 'failed-precondition',
      });
    };
    const report = await runCloudHealth(be, ctx);
    const username = report.results.find((r) => r.id === 'username')!;
    expect(username.status).toBe('fail');
    expect(username.remediation).toMatch(/index/i);
  });

  it('fails the username check (not skips) when search omits the user', async () => {
    const be = passingBackend();
    be.searchUsersByUsername = async () => []; // the old prefix bug: no results
    const report = await runCloudHealth(be, ctx);
    const username = report.results.find((r) => r.id === 'username')!;
    expect(username.status).toBe('fail');
    expect(username.detail).toMatch(/didn.t return it/i);
  });

  it('does not throw when a check rejects unexpectedly', async () => {
    const be = passingBackend();
    be.fetchLeaderboard = async () => {
      throw new Error('boom');
    };
    const report = await runCloudHealth(be, ctx);
    const lb = report.results.find((r) => r.id === 'leaderboard')!;
    expect(lb.status).toBe('fail');
    expect(report.results).toHaveLength(8); // all checks still reported
  });
});

describe('remediationFor', () => {
  it('maps known Firestore codes to specific fixes', () => {
    expect(remediationFor({ code: 'permission-denied' }, 'users/{uid}')).toMatch(/rules/i);
    expect(remediationFor({ code: 'unavailable' }, 'x')).toMatch(/reach Firestore/i);
    expect(remediationFor({ code: 'unauthenticated' }, 'x')).toMatch(/sign out/i);
  });

  it('falls back to a generic message for unknown codes', () => {
    expect(remediationFor(new Error('weird'), 'x')).toMatch(/weird/);
  });
});

describe('selftestId', () => {
  it('namespaces throwaway artifacts by uid', () => {
    expect(selftestId('u1')).toBe('selftest-u1');
  });
});
