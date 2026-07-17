/**
 * Cloud Health self-test — exercise every Firestore-backed social path against
 * the signed-in account and report pass / fail / skip with a plain-English fix.
 *
 * The whole point is to verify the online layer from ONE device: a single
 * signed-in person round-trips their own profile, username search, friend code,
 * invites, leaderboard and leagues, so config gaps (unpublished rules, a missing
 * index, a disabled provider) surface as a specific remediation rather than a
 * silent failure that only shows up when a second real player appears.
 *
 * This module is a **pure orchestrator**: it takes the backend as an injected
 * dependency (`CloudHealthBackend`), so it runs against a fake backend in unit
 * tests with zero Firebase. The real wiring lives in `CloudHealthPanel`.
 *
 * Non-destructive: real writes only ever touch the user's own docs, done
 * idempotently (re-publish profile, push the progress we just read). Synthetic
 * data goes to per-uid throwaway namespaces (`leaderboards/selftest-{uid}`, a
 * `selftest-{uid}` league that `listLeagues` filters out of the real UI). The
 * invite check cleans up after itself; the username check is read-only.
 */

import type { ProgressSnapshot } from './progress';
import { computeStandings } from './leagues';
// Type-only imports are erased at compile time, so this does NOT pull the
// Firebase SDK into the bundle — the concrete backend is injected at runtime.
import type {
  InviteDoc,
  LeaderboardEntry,
  LeagueResultDoc,
  PublicProfile,
} from '../services/firebaseBackend';

/** The subset of the Firebase backend the self-test drives. */
export interface CloudHealthBackend {
  pullProgress(uid: string): Promise<ProgressSnapshot | null>;
  pushProgress(uid: string, snapshot: ProgressSnapshot): Promise<void>;
  publishProfile(uid: string, name: string, friendCode: string): Promise<void>;
  getUserProfile(uid: string): Promise<PublicProfile | null>;
  checkUsernameAvailable(username: string): Promise<boolean>;
  searchUsersByUsername(term: string): Promise<PublicProfile[]>;
  resolveFriendCode(code: string): Promise<PublicProfile | null>;
  sendInvite(
    toUid: string,
    invite: { fromUid: string; fromName: string; roomCode: string },
  ): Promise<void>;
  watchInvites(uid: string, cb: (invites: InviteDoc[]) => void): () => void;
  clearInvite(uid: string, inviteId: string): Promise<void>;
  submitLeaderboardScore(
    boardId: string,
    entry: { uid: string; name: string; score: number },
  ): Promise<void>;
  fetchLeaderboard(boardId: string, topN?: number): Promise<LeaderboardEntry[]>;
  createLeague(league: {
    id: string;
    name: string;
    code: string;
    owner: { uid: string; name: string };
  }): Promise<void>;
  submitLeagueResult(leagueId: string, result: LeagueResultDoc): Promise<void>;
  fetchLeagueResults(leagueId: string): Promise<LeagueResultDoc[]>;
}

export interface CloudHealthContext {
  uid: string;
  name: string;
  username: string | null;
  friendCode: string;
  /** Current local progress snapshot (pushed + pulled to test sync). */
  progress: ProgressSnapshot;
}

export type CheckStatus = 'pass' | 'fail' | 'skip';

export interface CheckResult {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
  /** Present on failures — the specific console fix. */
  remediation?: string;
}

export interface HealthReport {
  results: CheckResult[];
  passed: number;
  failed: number;
  skipped: number;
  /** True when nothing failed (skips are fine). */
  ok: boolean;
}

/** A hidden namespace id for the throwaway self-test artifacts. */
export function selftestId(uid: string): string {
  return `selftest-${uid}`;
}

/** Marker room code used by the invite round-trip (so we can find + clear it). */
const INVITE_MARKER = 'SELFTEST';
const INVITE_TIMEOUT_MS = 6000;

function errCode(e: unknown): string {
  return e && typeof e === 'object' && 'code' in e
    ? String((e as { code: unknown }).code)
    : '';
}

/** Map a raw Firebase/Firestore error to a specific, actionable fix. */
export function remediationFor(e: unknown, path: string): string {
  switch (errCode(e)) {
    case 'permission-denied':
      return `Firestore denied access to ${path}. Publish the rules from firestore.rules (Firestore → Rules) — the ruleset must cover this path.`;
    case 'failed-precondition':
      return `This query needs a Firestore index. Open the link in the browser console error to create it, or add it under Firestore → Indexes.`;
    case 'unavailable':
      return `Couldn't reach Firestore. Check your connection and that the project is active (not paused).`;
    case 'unauthenticated':
      return `Your session isn't authenticated. Sign out and back in, then retry.`;
    case 'resource-exhausted':
      return `Firestore quota exceeded for the day. Try again later or raise the project's limits.`;
    default: {
      const code = errCode(e);
      const msg = e instanceof Error ? e.message : String(e);
      return `Unexpected error${code ? ` (${code})` : ''}: ${msg}. See the browser console for details.`;
    }
  }
}

/** Resolve once the invite inbox contains our marker, or after a timeout. */
function awaitMarkerInvite(
  be: CloudHealthBackend,
  uid: string,
): Promise<InviteDoc[]> {
  return new Promise((resolve) => {
    let settled = false;
    let unsub = () => {};
    const finish = (invites: InviteDoc[]) => {
      if (settled) return;
      settled = true;
      try {
        unsub();
      } catch {
        /* ignore */
      }
      resolve(invites);
    };
    try {
      unsub = be.watchInvites(uid, (invites) => {
        if (invites.some((i) => i.roomCode === INVITE_MARKER)) finish(invites);
      });
    } catch {
      finish([]);
    }
    setTimeout(() => finish([]), INVITE_TIMEOUT_MS);
  });
}

type Check = (
  be: CloudHealthBackend,
  ctx: CloudHealthContext,
) => Promise<CheckResult>;

const checks: Check[] = [
  // 1. Auth session
  async (_be, ctx) => {
    const ok = !!ctx.uid;
    return {
      id: 'auth',
      label: 'Signed-in session',
      status: ok ? 'pass' : 'fail',
      detail: ok ? `Signed in as ${ctx.name}.` : 'No signed-in user id.',
      remediation: ok ? undefined : 'Sign in before running the self-test.',
    };
  },

  // 2. Progress sync (push then pull — idempotent)
  async (be, ctx) => {
    try {
      await be.pushProgress(ctx.uid, ctx.progress);
      const remote = await be.pullProgress(ctx.uid);
      const ok = remote !== null;
      const blobs = remote
        ? (['career', 'profile', 'daily'] as const).filter((k) => remote[k] != null)
        : [];
      return {
        id: 'progress',
        label: 'Progress sync',
        status: ok ? 'pass' : 'fail',
        detail: ok
          ? `Pushed and read back your progress doc${blobs.length ? ` (${blobs.join(', ')}).` : ' (empty — nothing saved yet).'}`
          : 'Push succeeded but the doc read back empty.',
        remediation: ok ? undefined : remediationFor({}, 'progress/{uid}'),
      };
    } catch (e) {
      return fail('progress', 'Progress sync', e, 'progress/{uid}');
    }
  },

  // 3. Public profile publish + read
  async (be, ctx) => {
    try {
      await be.publishProfile(ctx.uid, ctx.name, ctx.friendCode);
      const prof = await be.getUserProfile(ctx.uid);
      const ok = !!prof && prof.friendCode === ctx.friendCode.toUpperCase();
      return {
        id: 'profile',
        label: 'Public profile',
        status: ok ? 'pass' : 'fail',
        detail: ok
          ? `Published and read back your profile (code ${prof!.friendCode}).`
          : 'Profile did not read back correctly.',
        remediation: ok ? undefined : remediationFor({}, 'users/{uid}'),
      };
    } catch (e) {
      return fail('profile', 'Public profile', e, 'users/{uid}');
    }
  },

  // 4. Username search (read-only)
  async (be, ctx) => {
    if (!ctx.username) {
      return {
        id: 'username',
        label: 'Username search',
        status: 'skip',
        detail: 'No username claimed yet — claim one to test search + lookup.',
      };
    }
    try {
      const available = await be.checkUsernameAvailable(ctx.username);
      const results = await be.searchUsersByUsername(ctx.username);
      const found = results.some((r) => r.uid === ctx.uid);
      const ok = !available && found;
      let detail: string;
      if (ok) detail = `Found @${ctx.username} via prefix search.`;
      else if (available)
        detail = `@${ctx.username} isn't registered in /usernames — the claim may not have written.`;
      else detail = `@${ctx.username} is registered but prefix search didn't return it.`;
      return {
        id: 'username',
        label: 'Username search',
        status: ok ? 'pass' : 'fail',
        detail,
        remediation: ok
          ? undefined
          : available
            ? remediationFor({}, 'usernames/{username}')
            : `Prefix search failed — usually a missing Firestore index on users.username, or the /usernames rules aren't published.`,
      };
    } catch (e) {
      return fail('username', 'Username search', e, 'users / usernames');
    }
  },

  // 5. Friend-code resolve (your own code)
  async (be, ctx) => {
    try {
      const prof = await be.resolveFriendCode(ctx.friendCode);
      const ok = !!prof && prof.uid === ctx.uid;
      return {
        id: 'friendcode',
        label: 'Friend-code lookup',
        status: ok ? 'pass' : 'fail',
        detail: ok
          ? `Resolved your code ${ctx.friendCode.toUpperCase()} back to your account.`
          : 'Your friend code did not resolve to your account.',
        remediation: ok ? undefined : remediationFor({}, 'friendCodes/{code}'),
      };
    } catch (e) {
      return fail('friendcode', 'Friend-code lookup', e, 'friendCodes/{code}');
    }
  },

  // 6. Invites (send → watch → clear; fully cleans up)
  async (be, ctx) => {
    try {
      await be.sendInvite(ctx.uid, {
        fromUid: ctx.uid,
        fromName: ctx.name,
        roomCode: INVITE_MARKER,
      });
      const invites = await awaitMarkerInvite(be, ctx.uid);
      const mine = invites.filter((i) => i.roomCode === INVITE_MARKER);
      const ok = mine.length > 0;
      // Clean up every marker invite we can see.
      for (const i of mine) {
        try {
          await be.clearInvite(ctx.uid, i.id);
        } catch {
          /* best-effort cleanup */
        }
      }
      return {
        id: 'invites',
        label: 'Match invites',
        status: ok ? 'pass' : 'fail',
        detail: ok
          ? 'Sent a test invite, saw it live, and cleared it.'
          : 'Sent a test invite but it never arrived (live watch timed out).',
        remediation: ok
          ? undefined
          : `Invite delivery failed — check the users/{uid}/invites rules are published and the live listener isn't blocked.`,
      };
    } catch (e) {
      return fail('invites', 'Match invites', e, 'users/{uid}/invites');
    }
  },

  // 7. Leaderboard submit + fetch (throwaway board)
  async (be, ctx) => {
    const board = selftestId(ctx.uid);
    try {
      await be.submitLeaderboardScore(board, {
        uid: ctx.uid,
        name: ctx.name,
        score: 1234,
      });
      const rows = await be.fetchLeaderboard(board, 10);
      const ok = rows.some((r) => r.uid === ctx.uid);
      return {
        id: 'leaderboard',
        label: 'Leaderboards',
        status: ok ? 'pass' : 'fail',
        detail: ok
          ? 'Submitted a score to a private test board and read it back.'
          : 'Submitted a score but it did not read back.',
        remediation: ok
          ? undefined
          : remediationFor({}, 'leaderboards/{board}/entries/{uid}'),
      };
    } catch (e) {
      return fail('leaderboard', 'Leaderboards', e, 'leaderboards/{board}/entries/{uid}');
    }
  },

  // 8. Friend leagues (create → result → standings; hidden league)
  async (be, ctx) => {
    const id = selftestId(ctx.uid);
    try {
      await be.createLeague({
        id,
        name: '__selftest',
        code: `SELF${ctx.uid}`.toUpperCase().slice(0, 20),
        owner: { uid: ctx.uid, name: ctx.name },
      });
      await be.submitLeagueResult(id, {
        uid: ctx.uid,
        key: 'selftest',
        points: 10,
        at: 0,
      });
      const results = await be.fetchLeagueResults(id);
      const standings = computeStandings(
        [{ uid: ctx.uid, name: ctx.name }],
        results,
      );
      const ok =
        results.some((r) => r.uid === ctx.uid) &&
        standings.some((s) => s.uid === ctx.uid && s.points >= 10);
      return {
        id: 'leagues',
        label: 'Friend leagues',
        status: ok ? 'pass' : 'fail',
        detail: ok
          ? 'Created a hidden test league, posted a result, and computed standings.'
          : 'League round-trip did not complete.',
        remediation: ok ? undefined : remediationFor({}, 'leagues/{leagueId}'),
      };
    } catch (e) {
      return fail('leagues', 'Friend leagues', e, 'leagues/{leagueId}');
    }
  },
];

function fail(
  id: string,
  label: string,
  e: unknown,
  path: string,
): CheckResult {
  return {
    id,
    label,
    status: 'fail',
    detail: e instanceof Error ? e.message : 'Failed.',
    remediation: remediationFor(e, path),
  };
}

/** Run every check in order and summarise. Never throws. */
export async function runCloudHealth(
  be: CloudHealthBackend,
  ctx: CloudHealthContext,
): Promise<HealthReport> {
  const results: CheckResult[] = [];
  for (const check of checks) {
    try {
      results.push(await check(be, ctx));
    } catch (e) {
      results.push(fail('unknown', 'Check', e, 'unknown'));
    }
  }
  const passed = results.filter((r) => r.status === 'pass').length;
  const failed = results.filter((r) => r.status === 'fail').length;
  const skipped = results.filter((r) => r.status === 'skip').length;
  return { results, passed, failed, skipped, ok: failed === 0 };
}
