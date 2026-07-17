# Cloud Health self-test — design

**Date:** 2026-07-17
**Status:** approved (brainstorm) → ready for plan
**Area:** online social layer (Firebase sign-in + Firestore: sync, friends, username
search, leaderboards, friend leagues)

## Problem

The social layer is fully built but has never been exercised against a live
Firestore project. Sign-in works ("seems to work"), but the friends / username
search / leaderboard / league code paths are dark: no way to know they work
without two accounts on two devices, which we can't drive from a build agent.
Reading the code already turned up one real defect (username prefix search).

## Goal

Let **one signed-in person on one device** prove every Firestore-backed path works
against *their own* project, and — when one fails — see the exact console fix.
Reusable forever as a config verifier (re-run after any rules/provider change).

Non-goals (YAGNI): no CI/emulator integration harness; no changes to gameplay or
the Ably/Supabase multiplayer paths; no new dependencies; no server-side scoring.

## Approach (chosen: A)

An in-app diagnostic that runs real round-trips against the signed-in account and
renders a green/amber/red checklist, each failed row mapping the raw Firebase
error code to a plain-English remediation.

## Architecture

Three new units + two small fixes. All game rules stay in `lib/`; the component
only renders state and calls the orchestrator.

### 1. `src/lib/cloudHealth.ts` (pure orchestrator, unit-tested)

- Exposes `runCloudHealth(deps): Promise<HealthReport>`.
- `deps` is an injected interface — the subset of `firebaseBackend` functions the
  checks call, plus `{ uid, name, username, friendCode }`. Because the backend is
  injected, the orchestrator runs against a **fake backend** in tests with zero
  Firebase.
- Checks are an ordered data list; each returns
  `CheckResult { id, label, status: 'pass'|'fail'|'skip', detail, remediation? }`.
- `mapError(code): remediation` maps Firebase codes:
  - `permission-denied` → rules for `<path>` not published — copy the ruleset from
    `firestore.rules` into Firestore → Rules.
  - `failed-precondition` → query needs a Firestore index — open the link in the
    browser console error, or add it under Firestore → Indexes.
  - `unavailable` / network → couldn't reach Firestore; check connection / project
    active.
  - `operation-not-allowed` → auth provider not enabled.
  - `not-found` → expected-empty in some checks (treated as pass/skip, not fail).

### 2. `src/lib/usernamePrefix.ts` (tiny pure helper, unit-tested)

`usernamePrefixRange(term): { start, end }` returning `start = lower`,
`end = lower + ''`. Extracted so the prefix range is testable (the backend
file can't be unit-tested — it statically imports the SDK). `firebaseBackend`
imports this helper for its search query.

### 3. `src/components/settings/CloudHealthPanel.tsx`

- "Run self-test" button + checklist rows (icon + label + detail; failed rows
  expand to remediation). Accessible: not colour-only (icons + text), `aria-live`
  on the status region.
- Lazy-imports `firebaseBackend` (SDK stays code-split), builds `deps`, calls
  `runCloudHealth`, renders the report.
- Rendered inside `SettingsModal` under a new "Cloud health" section, shown only
  when `configured && user` (from `useAuth()`).

## The checks (each a real round-trip; non-destructive)

1. **Auth session** — `uid`/`email` present.
2. **Progress sync** — `pushProgress(uid, readLocalProgress())` then
   `pullProgress(uid)` returns a doc. Idempotent (pushes what it read).
3. **Public profile** — `publishProfile(uid, name, friendCode)` then
   `getUserProfile(uid)` matches. Re-publishes own profile (idempotent).
4. **Username search** — read-only. If a username is claimed:
   `checkUsernameAvailable(username)` is `false` (taken by self) **and**
   `searchUsersByUsername(prefix)` includes self (this is the check the prefix bug
   was failing). If no username yet: `skip` with a "claim a username to test
   search" note.
5. **Friend-code resolve** — `resolveFriendCode(myCode)` returns own profile.
6. **Invites** — `sendInvite(uid, self)` → `watchInvites(uid)` (one snapshot)
   sees it → `clearInvite`. Fully cleans up.
7. **Leaderboard** — `submitLeaderboardScore('selftest-{uid}', {uid,name,score})`
   then `fetchLeaderboard('selftest-{uid}')` includes it. Throwaway board id keeps
   it off real boards.
8. **Leagues** — ensure a `selftest-{uid}` league (create if `getLeague` is null)
   → `submitLeagueResult` → `fetchLeagueResults` includes it → `computeStandings`
   is non-empty. League id is filtered out of the real `listLeagues` UI.

### Non-destructive guarantees

- Real docs touched are only the user's own, written idempotently (profile,
  progress).
- Fake data lives in per-uid throwaway namespaces (`leaderboards/selftest-{uid}`,
  league id `selftest-{uid}`). Firestore rules deliberately forbid client deletes
  on those collections, so a couple of inert artifacts persist — hidden from real
  UI by an id-prefix filter, documented here.
- Username check never claims a throwaway name (usernames can't be released).

## Fixes folded in

- **Bug:** `firebaseBackend.searchUsersByUsername` upper bound is `lower + ''`
  (≡ `lower`) → exact-match only, never a prefix. Fix via `usernamePrefixRange`.
- **Ship rules as a file:** add `firestore.rules` (the ruleset currently lives
  only inside `FIREBASE_SETUP.md`) so it's version-controlled and copy-paste-exact;
  `FIREBASE_SETUP.md` points at it.
- Filter `selftest-` league ids out of `listLeagues` results (in
  `firebaseBackend.listLeagues` or the leagues provider) so the diagnostic's
  artifact never shows in the real leagues list.

## Testing

- `cloudHealth.test.ts` — fake backend: all-pass path; each failure code →
  correct remediation; skip path for no-username.
- `usernamePrefix.test.ts` — asserts the `` upper bound and lowercasing.
- No changes to match engine / scoring / question data → existing 496 tests stay
  green.

## Rollout

Feature is invisible unless signed in; ships behind Settings. No config change
required to deploy. After merge, owner runs the self-test once from their account
to confirm the live project is green.
