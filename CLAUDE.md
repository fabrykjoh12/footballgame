# CLAUDE.md

Guidance for Claude Code (and humans) working in this repo. This reflects the
**current** state of the project so a fresh session can continue seamlessly.

## What this is

**Ball Knowledge** — a real-time 1v1 football (soccer) knowledge duel.
Two players join a room with a short code and play a **10-question match** built
from **ten mini-games**. Points convert into **goals** for a football-style
score ("Sara FC 3–2 Jonas United"). React + TypeScript + Vite + Tailwind.
Fully playable offline vs a CPU; real-time multiplayer via Ably (or Supabase)
when keys are present.

Built and working: 10 mini-games, **1,111 questions**, live Ably 1v1 (verified +
hardened), a singleplayer **Career Mode** (climb from League Two to the Premier
League), **solo arcade game modes** (Survival / Time Attack / Gauntlet), a typed **Connections** mode *(beta)* — name a player who played for both clubs, **themed Cup
Runs** (knockout tournaments), **optional
sign-in with cross-device progress sync** (Firebase Auth), a
**friends list with friend codes + invite-to-room** (no dictating codes), an
**online daily/all-time leaderboard**, **achievements**, **head-to-head records**,
per-device **question-freshness**, Daily Challenge, local profile/stats, sound,
share-as-image, live commentary, a 0–90' match timeline, **sudden-death stoppage
time**, a lobby topic filter, deterministic per-team kit colours, a premium UI
pass, and **265 unit tests** gating an auto-deploy pipeline.

> "Football" always means **European football / soccer**. Never use real club
> badges or player photos — visuals are gradients, pitch patterns, icons, type.
>
> **Content scope: men's football only.** Do not add women's football questions.

## Commands

```bash
npm install
npm run dev      # dev server at http://localhost:5173
npm run build    # tsc -b && vite build  (ALWAYS run before committing UI/logic)
npm run build:pages  # tsc -b && vite build --base=./  (relative base for Pages)
npm run preview  # serve the production build
npm run lint     # tsc --noEmit (type-check only)
npm test         # vitest run (265 tests across lib/, data/, services/)
```

Gates: `npm run build` (strict `tsc`) and `npm test` (Vitest). **CI runs the
tests before every deploy.** No ESLint config. Tests live next to sources as
`*.test.ts` and are excluded from the app build. Keep both green.

## Architecture (read this first)

The UI never talks to a backend directly. It talks to the **`GameService`**
interface (`src/types/game.ts`). Three implementations are swapped by a factory:

- `LocalGameService` — offline, opponent is a bot (`botPlayer.ts`).
- `AblyGameService` — real-time via Ably channels.
- `SupabaseGameService` — real-time via Supabase Realtime broadcast.

`src/services/gameService.ts` is the factory: `createGameService(intent)` returns
local for `'demo'`, otherwise the configured remote backend (Ably preferred),
lazily `import()`-ed so the SDKs are **code-split out of the main bundle**.

All paths share one authoritative state machine:

- **`src/services/matchEngine.ts`** owns the single `Room`, runs all timers
  (question countdown, result auto-advance), applies scoring, runs **sudden-death
  stoppage time** (golden goal off reserve `tiebreakers` when level on goals at
  full time), and emits a fresh `Room` snapshot on every transition. **In
  multiplayer, only the HOST runs the engine** and broadcasts snapshots; guests
  render snapshots and send their actions (join / answer) back to the host.

React wiring: `src/context/GameProvider.tsx` subscribes to the active service and
exposes `room`, `localPlayer`, `opponent`, `connectionState`, and actions
(`createRoom`, `joinRoom`, `playDemo`, `playDaily`, `playCareer`,
`updateSettings`, `startMatch`, `submitAnswer`, `nextQuestion`, `rematch`,
`leaveRoom`, `pauseMatch`/`resumeMatch`) via the `useGame()` hook. `src/App.tsx`
routes screens off `room.status` (`lobby → starting/in_question/showing_result →
finished`) plus a tiny top-level `view` state (`home`/`career`) for the
singleplayer menus when no match is live; a finished room routes to
`CareerResult` when `settings.careerMatch`, else `FinalResult`. The tree is
`AuthProvider → GameProvider → AppShell → Screens`; `AppShell` shows the global
connection banner + the header `AccountButton`, and `Screens` shows a brief
"Restoring your progress…" splash while a signed-in session hydrates.

```
HomePage → LobbyPage → GamePage (MatchTimeline / Scoreboard / CommentaryTicker /
           QuestionCard / ResultReveal / GoalAnimation) → FinalResult
HomePage → CareerHub → (career fixture = a local match) → CareerResult → CareerHub
```

## The ten mini-games

All are variants of the `Question` discriminated union (`types/game.ts`). Each
has a `QuestionCard` render branch, a `scoring.ts` `BASE_POINTS`/`MAX_SPEED_BONUS`
entry (TS-enforced `Record<QuestionType,…>`), a `MATCH_TYPE_DISTRIBUTION` slot,
and a `pickOfType` line in `questionPicker.ts`. The bot (`botPlayer.ts`) and
`ResultReveal` handle MC types generically via `options`.

| Type | UI | Shape |
| --- | --- | --- |
| `who_am_i` | progressive clues + 4 options | `clues[]` (≥3, vague→specific), `options`, `correctAnswer` |
| `career_path` | club chain | `path[]`, `options`, `correctAnswer` |
| `higher_lower` | two VS cards | `leftOption{name,value}`, `rightOption`, `correctAnswer` = higher-value side |
| `club_country` | prompt + 4 options | `options`, `correctAnswer` |
| `guess_year` | 4 year chips (chronological) | `options` (4 year strings), `correctAnswer` |
| `transfer_fee` | 4 money chips | `options` (4 `€`/`£` fees, one currency), `correctAnswer` |
| `pitch_position` | vertical 4-line pitch grid | `options` = `PITCH_ZONES`, `correctAnswer` |
| `odd_one_out` | prompt + 4 options | `options`, `correctAnswer` = the exception (the one that doesn't belong) |
| `spot_the_lie` | prompt + 4 statements | `options` (4 statements), `correctAnswer` = the FALSE one |
| `guess_the_number` | numeric slider (`min`–`max`) | `correctAnswer` (numeric string), `min`, `max`, `step?`, `unit?` — **scaled closeness scoring** (no options) |

Per-match mix (10 Qs): every type ×1 — `who_am_i, career_path, higher_lower,
club_country, guess_year, transfer_fee, pitch_position, odd_one_out, spot_the_lie,
guess_the_number` (`MATCH_TYPE_DISTRIBUTION` in `matchModes.ts`).

**Guess the Number** is the one non-all-or-nothing type: the answer is a value on
a slider, and points scale linearly with closeness (`guessAccuracy` in
`scoring.ts`) — 10% off pays ~90% of the pot, 90% off pays ~10%, ≥100% off pays 0.
A guess within `GUESS_NUMBER_CORRECT_WITHIN` (20%) counts as "correct" for
streaks/stats; the streak bonus only applies then. The match engine derives
`isCorrect`/`accuracy` for this type and feeds `accuracy` into
`calculateQuestionPoints`.

## Scoring & match flow (`src/lib/scoring.ts`, pure)

- **Points → goals:** `POINTS_PER_GOAL = 2500`, capped at `MAX_GOALS = 5`. (We
  simulated raising it; it doesn't reduce draws and spikes 0-0s, so 2500 stays.)
- **Per correct answer:** base (`who_am_i` decays 1000→700→400 by clue stage;
  others 700–800) + speed bonus (linear with time left, max 200–300) + streak
  bonus (2→50, 3→100, 4+→150).
- **Football events** (overlay + commentary): `goal`, `equalizer`,
  `late_winner`, `hat_trick`, `counterattack`.
- **Full time level on goals → sudden death:** host serves reserve
  `tiebreakers`; first round one side wins outright = **golden goal** (+1 goal,
  makes the scoreline decisive). SD does **not** move goals via points; only the
  golden goal does. Caps at the reserve pool, then falls back to the points
  decider.
- **Points decider:** when goals are level and no golden goal resolves it, the
  higher points total wins — surfaced honestly everywhere as "win **on points**"
  (FinalResult, share image, share text), never a bare "3–3 + you win".

## Where things live

| Area | Path |
| --- | --- |
| Domain types (source of truth) | `src/types/game.ts` |
| Scoring, goals, events, sudden-death helpers (pure) | `src/lib/scoring.ts` |
| Question selection (per-type mix, difficulty, topic filter, answer-position randomize, tiebreakers) | `src/lib/questionPicker.ts` |
| Topic/category filter options | `src/lib/categories.ts` |
| Question database (1,111 Qs, 10 types) | `src/data/questions.ts` |
| Match modes (Casual/Serious/Nightmare) | `src/lib/matchModes.ts` |
| Daily Rival Match + seeded RNG (deterministic per-day fixture vs a named fictional rival; streak, scoreline, best category, "beat my result" challenge links, tomorrow countdown) | `src/lib/dailyChallenge.ts`, `src/lib/dailyRival.ts`, `src/lib/seededRandom.ts`, `src/components/home/DailyRivalCard.tsx` |
| Career Mode (divisions, season schedule, AI sim, promotion) | `src/lib/career.ts`, `src/components/career/` |
| Solo arcade modes (Survival / Time Attack / Gauntlet; self-contained, no match engine) | `src/lib/soloModes.ts`, `src/lib/soloProgress.ts`, `src/components/solo/` |
| Connections solo mode (typed "player who played for both clubs"; fuzzy match + autocomplete; self-contained, no match engine) | `src/lib/connections.ts`, `src/data/connections.ts`, `src/components/connections/` |
| Themed Cup Runs (knockout tournaments over local matches, like Career) | `src/lib/cup.ts`, `src/components/cup/` |
| Optional sign-in + cross-device progress sync (Firebase) | `src/context/AuthProvider.tsx`, `src/lib/progress.ts`, `src/lib/firebaseConfig.ts`, `src/services/firebaseBackend.ts`, `src/components/auth/` |
| Local profile / lifetime stats | `src/lib/profileStats.ts` |
| Per-device question-history (recent-repeat avoidance, local) | `src/lib/questionHistory.ts` |
| Achievements / badges (derived from stats, pure unlock rules) | `src/lib/achievements.ts`, `src/components/home/TrophyCabinet.tsx` |
| Head-to-head record vs each opponent (local) | `src/lib/headToHead.ts` |
| Friends list + friend codes + invite-to-room (local-first; Firestore online layer) | `src/lib/friends.ts`, `src/context/FriendsProvider.tsx`, `src/components/friends/` |
| Online leaderboard (daily + all-time, Firestore; SDK-free wrappers) | `src/lib/leaderboard.ts`, `src/components/home/TrophyCabinet.tsx` |
| Private friend leagues (Daily-fed season tables; pure standings + Firestore) | `src/lib/leagues.ts`, `src/lib/leaguesLocal.ts`, `src/context/LeaguesProvider.tsx`, `src/components/leagues/` |
| Live commentary text generator (pure) | `src/lib/commentary.ts` |
| Question-as-attack football framing (pure; per-answer Big Chance / Good Attack / Half Chance / Woodwork / Shot Saved / Turnover / GOAL, + Momentum/Late-Pressure accents) | `src/lib/attackFraming.ts` |
| Match-timeline event builder (pure; turns each question into goal/chance/save marks via attackFraming; minute mapping) | `src/lib/matchTimeline.ts` |
| Post-match summary (pure; possession-style knowledge share, shots/chances, best/weakest category, biggest moment, Man of the Match, timeline replay) | `src/lib/matchStats.ts` |
| Deterministic per-team kit colours | `src/lib/teamIdentity.ts` |
| Pitch zones constant | `src/lib/positions.ts` |
| Sound (Web Audio, synth, no files) | `src/lib/sound.ts` |
| Share: result-card model (accolades: perfect/comeback/nightmare/late-winner/daily/promotion/cup-win) + canvas matchday card + copy-paste text (all share image+text drive off the one model) | `src/lib/shareCard.ts`, `src/lib/shareImage.ts`, `src/lib/shareResult.ts` |
| Realtime connection-state mapping (pure) | `src/services/connectionMapping.ts` |
| Realtime env detection (SDK-free) | `src/lib/realtimeConfig.ts` |
| Components | `src/components/{layout,home,lobby,game,career,ui}` |
| Styling tokens / animations | `tailwind.config.js`, `src/styles/globals.css` |

## Features built this far

- **Career Mode** (singleplayer) — climb from League Two to the Premier League.
  Pure engine in `career.ts`: 4 divisions (each maps to a harder match `mode` +
  tighter clock), a 6-team single round-robin season (you play 5 fixtures for
  real; rival AI-vs-AI results are deterministically simulated per round off the
  season seed), a derived league table, promotion/relegation (top 2 / bottom 2),
  trophies, and win-the-top-flight as the goal. Persisted in localStorage
  (`bk_career_v1`). Career fixtures are normal local matches flagged
  `settings.careerMatch`; `App.tsx` routes the finished room to `CareerResult`
  (records the scoreline + advances the season) instead of `FinalResult`. The CPU
  opponent's club name is forced via `LocalGameService({ botName })` →
  `createGameService(intent, opts)` → `playCareer()`. Screens: `CareerHub`,
  `CareerResult`, `LeagueTable`. **No match-engine changes** — it's a layer on top.
- **Optional sign-in + cloud sync (Firebase)** — local-first; everything works
  anonymously. When **Firebase** is configured (`isFirebaseConfigured`), a header
  **Sign in** button appears with three methods (Firebase Auth): **email +
  password**, **Google** (popup), and passwordless **email link**. On
  sign-in the app pulls the player's Firestore doc (`progress/{uid}`) and
  reconciles it with local (`reconcileProgress` in `progress.ts` — remote wins
  per blob, local fills gaps, so a first sign-in never wipes local progress),
  then debounce-pushes on every save. The three durable blobs (`bk_career_v1`,
  `bk_profile_v1`, `bk_daily_v1`) are synced as JSON. `AuthProvider` gates a brief
  "Restoring your progress…" splash while hydrating; on load it runs
  `completeEmailLinkSignIn()` to finish a returning link. **All Firebase SDK use
  is in `services/firebaseBackend.ts`, only ever reached via a dynamic import**,
  so it's code-split out of the main/anonymous bundle and the UI is hidden when
  unconfigured. This is **independent of multiplayer** (Ably/Supabase). Save
  sites notify via a `bk:progress-changed` window event from each
  `save()`/`saveCareer()`. Setup in `FIREBASE_SETUP.md`.
- **Connections** *(beta)* — a typed singleplayer mode: "name a player who has
  played for BOTH clubs". Self-contained (`lib/connections.ts` +
  `data/connections.ts` + `components/connections/`), mirroring the solo-modes
  pattern — **no match-engine changes**. 27 curated club-pair puzzles with
  generous, fact-checked `accept` lists across all four difficulty tiers (men's
  football only). Answers are **typed with forgiving fuzzy matching**
  (`normalizeName` strips accents/case/punctuation; accepts full name, surname,
  multi-word surname, or alias) and a **spelling autocomplete** (`suggestNames`)
  sourced from the whole player-name pool so suggestions never single out the
  current answer. A run is 10 puzzles ramping easy→nightmare, per-puzzle clock,
  speed+streak scoring, a reveal listing every accepted player, best score in
  `bk_connections_v1`, and a dedicated freshness ring (`bk_conn_history_v1`).
  Reached via a home card + the `'connections'` view in `App.tsx`. **UI flagged
  "Beta"** (home card + in-game badge) — the matcher is forgiving but accept-lists
  are hand-curated, so an obscure valid answer can still read as wrong.
- **Daily Challenge** — one deterministic puzzle/day (seed from the date via
  `seededRandom`), tracked streak + best score in `dailyChallenge.ts`; home card.
- **Local profile** — lifetime matches/win-rate/accuracy/best-streak in
  `profileStats.ts`; home card. (No backend; localStorage.)
- **Topic filter** — host picks preferred topics in the lobby; a *soft* filter
  in `pickOfType` (prefers topics within the mode's difficulty tier, tops up so a
  match is always a full 10). Empty = all.
- **Match feel** — `CommentaryTicker` (LIVE bar reacting to each question),
  `MatchTimeline` (0–90', goal markers in kit colours, 90+' in stoppage),
  sudden-death stoppage time.
- **Team identity** — `teamIdentity.ts` maps a name → a stable "kit" colour
  (curated palette, two-distinct guarantee); used on the scoreboard + timeline.
- **Sound** — synthesized via Web Audio (whistle, click, correct/wrong, goal,
  win); honors the `bk_sound` toggle; unlocked on first interaction.
- **Share** — canvas 1080² matchday card (native share / download) + copy text.
- **Multiplayer hardening** — connection banner (reconnecting/failed), guest
  auto-resync on reconnect, lobby-slot release on leave, mid-match
  disconnect/rejoin flags, guest-side countdown rebasing for clock skew.

## Design system & UI conventions

- **Game rules live in `lib/`, never in components.** Components read state and
  call actions; they don't compute scores or own game logic.
- TypeScript strict mode; `noUnusedLocals`/`noUnusedParameters` are on.
- Discriminated unions over `any`. Keep components small and typed.
- **Accessibility:** correct/wrong states must not rely on colour alone (icons +
  text); real `<button>`s with aria labels; mobile-first; `prefers-reduced-motion`
  is respected (globals.css neutralizes animations/transitions).
- **Tailwind + custom tokens:** colours (`pitch` neon-green accent, `ink` navy
  scale, `gold`); shadows (`glow`, `elev-1/2`); easing **`ease-premium`**
  (`cubic-bezier(.16,1,.3,1)`); animations `fade-in`, `scale-in`, **`rise-in`**
  (premium entrance), `goal-pop`, `pulse-glow`, etc.
- **Component helpers (globals.css):** `.glass` / `.glass-strong` (layered-depth
  glassmorphism — lit top edge + contact + ambient shadow), `.input-field`
  (recessed integrated input), `.answer-press` (premium press), gradient text.
- **Neon green is a strategic accent**, not a fill — it's the single primary CTA
  + focus/accents; teams use kit colours; surfaces are neutral glass.
- The `Button` component owns variants + premium hover-lift/active-press
  (gated `enabled` + `motion-safe`). The premium look runs across all screens.

## Adding content (invariants are enforced by tests)

Append to `src/data/questions.ts`. Use a fresh id suffix to avoid collisions
(existing batches use `-001`, `-101`, `-201`, `-301`, `-401`).

- **MC types** (`who_am_i`, `career_path`, `club_country`, `guess_year`,
  `transfer_fee`, `pitch_position`): exactly **4 distinct `options`** with
  `correctAnswer` character-for-character among them.
- **`higher_lower`:** `correctAnswer` must equal the **higher-`value`** side
  (prompts are "MORE/OLDER/won more"); values are approximate but direction-stable.
- **`guess_year`:** four 4-digit year strings; the correct year must NOT cluster
  in one chronological slot across the set (a test caps any slot at ≤45%). Pick
  distractors so the answer lands in varied positions after ascending sort.
- **`transfer_fee`:** one currency per question (`€` or `£`), format `€222m`;
  phrase prompts "Roughly how much…".
- **`pitch_position`:** `options` = `PITCH_ZONES` (`Goalkeeper, Defender,
  Midfielder, Forward`); pick players with an unambiguous primary role.
- **`who_am_i` clue calibration (house style):** clue 1 = *nationality/region +
  position + ONE distinctive non-giveaway trait/era* — NOT clubs or exact
  nicknames (those go in clue 2+). Vague→specific; ≥3 clues. e.g. "I am a
  Brazilian striker of the 1990s, deadly inside the box."
- **Answer positions are randomized at pick time** (`randomizeAnswerOrder`) so
  the correct answer isn't always "A" — keep authoring data with the correct
  answer wherever; the picker shuffles (years sort chronologically; pitch zones
  stay fixed).
- **New mini-game type:** add a `Question` variant (`types/game.ts`), handle it in
  `scoring.ts` (both records) + `matchModes.ts` distribution + `questionPicker.ts`
  (select + any `randomizeAnswerOrder` special-case), add a `QuestionCard` branch,
  and confirm `botPlayer.ts` + `ResultReveal.tsx` cope (generic via `options`).

## Testing

`npm test` runs **265 tests** across 29 files: `scoring` (incl. **`guessAccuracy` +
closeness-scaled points** for Guess the Number), `questionPicker` (distribution,
difficulty, anti-bias shuffle, determinism, topic filter, **history-avoidance**
that exhausts unseen questions first but stays deterministic when seeded),
`questionHistory` (recent-ring push/cap), `questions` (data integrity invariants
above, incl. numeric-in-range for `guess_the_number`), `matchEngine` (lifecycle,
scoring, **sudden death**, timeout) with fake timers, `career` (round-robin
schedule, standings, fixtures, deterministic AI sim, promotion/relegation),
`achievements` (unlock thresholds), `headToHead` (W/D/L tally, idempotency),
`friends` (codes, invite link/text, list de-dupe), `leaderboard` (board ids),
`leagues` (join codes, standings aggregation/tie-breaks/dedupe),
`soloModes` (gauntlet/survival/time-attack selection + grading), `soloProgress`
(best-score folding), `connections` (fuzzy name matching, accept-list integrity —
every accepted player matches its own puzzle, picker freshness, closeness/streak
scoring, autocomplete suggestions), `cup` (bracket progression, trophies, didWinTie),
`progress` (sign-in reconcile rules), `commentary`, `teamIdentity`,
`connectionMapping`, `dailyChallenge`, `seededRandom`, `shareResult`,
`profileStats`. Add a test when you add an invariant or a rule.

## Realtime / env

Env vars (build-time, `VITE_` prefixed; see `.env.example`):

- `VITE_ABLY_API_KEY` — enables Ably multiplayer (preferred).
- `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` — enables Supabase multiplayer.
- `VITE_FIREBASE_API_KEY` + `VITE_FIREBASE_AUTH_DOMAIN` +
  `VITE_FIREBASE_PROJECT_ID` + `VITE_FIREBASE_APP_ID` — enables **optional
  sign-in + progress sync** (Firebase; independent of multiplayer).

No keys → demo mode (vs CPU) everywhere, no sign-in button. Setup guides:
`ABLY_SETUP.md`, `SUPABASE_SETUP.md`, `FIREBASE_SETUP.md`. **Status:** demo +
local loop verified; **live Ably 1v1 verified** across two devices, with
disconnect/reconnect handling, lobby-slot release on leave, and guest-side
countdown rebasing to neutralise clock skew (see `ablyGameService.ts`). The
Supabase multiplayer path and the Firebase sign-in path are built but **not yet
device-tested**.

## Deployment — auto-deploy via GitHub Actions

`.github/workflows/deploy.yml` ("Deploy preview") runs on **push to `main`**
(and `workflow_dispatch`): `npm ci` → `npm test` → `npm run build:pages` →
publishes `./dist` to the **`gh-pages`** branch (`peaceiris/actions-gh-pages`).
Live at `https://fabrykjoh12.github.io/footballgame/` (Pages → deploy from
`gh-pages`). Tests must pass or the deploy is blocked. The build step forwards
**all** optional secrets as env: `VITE_ABLY_API_KEY`, `VITE_SUPABASE_URL`/
`VITE_SUPABASE_ANON_KEY`, and the `VITE_FIREBASE_*` set — each only takes effect
once you add it under Settings → Secrets → Actions. Trigger a fresh deploy after
adding a secret (the build bakes env in at compile time): push, or Actions →
Deploy preview → Run workflow, or `git commit --allow-empty`.

Gotchas:
- **Base path:** Project Pages serve under `/footballgame/`; we build with
  `--base=./` (relative). A plain `npm run build` (base `/`) white-screens on Pages.
- The repo-root `index.html` is the Vite **dev** template (references
  `/src/main.tsx`); it includes a loading fallback for bundle-load failures.
- `import.meta.env`, `Date.now()` etc. are fine in-app but unavailable in plain
  Node — don't import app modules into ad-hoc Node scripts; run via `tsx`.

## Status & open items

- ✅ Done: 10 mini-games, 1,111 Qs, live Ably 1v1 + hardening (incl. **guest-side
  host-drop detection** → reconnecting/failed instead of a frozen match),
  **Career Mode** (singleplayer league climb), **optional sign-in + cross-device
  progress sync** (Firebase Auth email link), Daily Challenge, profile/stats,
  **per-device question-freshness (recent-repeat avoidance)**, **achievements /
  badges**, **head-to-head records**, **friends list + friend codes +
  invite-to-room** (local-first share link, plus online live push invites when
  signed in), **online daily + all-time leaderboard** (Firestore), sound, share
  (image+text), commentary (now an `aria-live` region), timeline, sudden death,
  topic filter, kit colours, premium UI across all screens, **solo arcade modes**
  (Survival / Time Attack / Gauntlet), **themed Cup Runs**, and a **Connections**
  *(beta)* typed mode, 265 tests + CI.
- 🧪 **Connections is shipped as BETA.** It works and is unit-tested + browser-
  smoked, but it's flagged Beta in the UI because the `accept` lists are
  hand-curated — a valid but obscure player can read as wrong (softened by the
  "Accepted: …" reveal). To harden it out of beta: expand accept-lists + puzzle
  count, optionally add a Daily Connections, and consider a "report this answer"
  affordance. Data lives in `src/data/connections.ts`; matcher in
  `src/lib/connections.ts`.
- ⏳ Open: **friends / leaderboard / friend-leagues online layer** is built +
  code-split + gated on Firebase sign-in, but **not device-tested** (needs two
  signed-in accounts). **Friend leagues** = private season tables fed by each
  member's Daily Challenge score (pure standings engine in `leagues.ts` is
  tested; sync needs Firebase + the league rules in `FIREBASE_SETUP.md`);
  the local-first friends + share-link invite path works anonymously today.
  Leaderboard scoring is **client-trusted** (host runs the engine) — fine for
  casual boards, not safe for ranked without server-side validation. **Supabase
  multiplayer path** built but not device-tested.
- 🔧 Firebase sign-in — current operational state (as of last session): the
  `VITE_FIREBASE_*` repo secrets are **added** and the live site shows the **Sign
  in** button (modal verified on device). **Still pending on the owner's side**
  in the Firebase console: (1) enable the sign-in providers under Authentication
  → Sign-in method (**Email/Password** is simplest + most reliable; Google +
  email-link optional) — until then sign-in returns `auth/operation-not-allowed`;
  (2) add `fabrykjoh12.github.io` to Authentication → Settings → Authorized
  domains (for Google + email-link redirects); (3) create Firestore + publish the
  **expanded** security rules so cross-device **sync** AND the friends/leaderboard
  features turn on — the rules now cover `progress/{uid}` (private sync),
  `users/{uid}` (+ `friends`/`invites` sub-collections), `friendCodes/{code}`, and
  `leaderboards/{board}/entries/{uid}` (sign-in works without them — those
  features just no-op). Steps + the full ruleset in `FIREBASE_SETUP.md`. The owner is doing
  all setup **web-only** (no terminal); the Firestore *Rules* editor is the
  Firestore one (`service cloud.firestore`), NOT Realtime Database (JSON).

## Roadmap — next things we can do

Concrete, mostly-scoped ideas for a future session (roughly ordered by
bang-for-buck; none are committed yet — confirm with the owner before building):

- **Harden Connections out of beta** — expand the curated `accept` lists and add
  more club pairs; add a **Daily Connections** (one seeded puzzle/day with a
  streak, like the Daily Challenge); optionally a "this should've been accepted"
  report affordance to grow the lists. Eventually fold it into the 1v1 mix as an
  11th type once the matcher is battle-tested (it'd need a `QuestionCard` text
  branch + a host-side accept-list grade in `matchEngine.submitAnswer`).
- **More content** — keep growing the 1,111-question bank (the batched
  `questionsBX.ts` + integrity-test pipeline is proven); watch the per-type /
  per-difficulty pool depth (smallest Casual pools are guess_the_number ~25,
  spot_the_lie ~27).
- **Get the online layer live** — finish the owner-side Firebase console steps
  (`FIREBASE_SETUP.md`) and device-test friends + leaderboards + friend leagues
  with two signed-in accounts. This unlocks the biggest built-but-dark surface.
- **Retention loop** — daily streak rewards, a "comeback" nudge, and surfacing
  achievements/leaderboard placement more prominently on the home screen.
- **Trustworthy ranked** — scoring is host/client-trusted today; a real ranked
  mode needs server-side validation (a thin Cloud Function or Supabase RPC that
  re-derives the score from the answer log). Big lift; only if competitive play
  becomes a goal.
- **New mini-game ideas that fit the constraints** (10-question, 1v1, men's
  football, license-free): "Starting XI" (name N players from a famous lineup),
  "Top Scorer" (rank goal tallies), "Same Number" (players who wore a shirt
  number), "Manager Merry-go-round" (typed, like Connections but for managers).
- **Multiplayer tournament bracket** (>2 players in a lobby) — discussed, not
  built; needs new lobby infra beyond the current 2-slot room. Largest lift here.
- **Polish** — bundle code-splitting (main chunk is ~720 kB; the build warns),
  more share-card variety, and accessibility passes on the newest screens.

See `GAME_OVERVIEW.md` for a portable, self-contained summary of the whole game
(useful for handing to another tool/AI for outside opinions).

## Gotchas

- Only the host's engine is authoritative in multiplayer; never run scoring on
  the guest. Guest `submitAnswer` publishes to the host.
- Scoring is intentionally client-trusted (host) — fine for casual play, **not**
  safe for ranked without server-side validation.
- Sudden-death `tiebreakers` ride the Room snapshot so guests see SD questions;
  the golden goal is applied in `resolveQuestion` (not derived from points).
- Daily Challenge and team kit colours are **deterministic** (seeded / hashed) —
  don't introduce `Math.random()` into those paths.
- React `StrictMode` is on (dev double-invokes effects); keep effects idempotent.
- **Full-screen overlays/modals must render via `createPortal(…, document.body)`**
  (see `AccountButton.tsx` at `z-[100]`). Nesting an overlay inside the header
  let the home screen's animated cards (transform/opacity → own stacking
  contexts) interleave with it; a body-portal escapes all ancestor stacking.
- **Glass surfaces are ~6% opaque + `backdrop-blur`** — fine on the dark stadium
  bg, but a modal layered over bright content needs a *solid* panel (`bg-ink-800`)
  or it reads as see-through when a browser skips the blur.
- Career fixtures count toward lifetime profile stats too (`CareerResult` calls
  `recordMatchResult`); the per-fixture record is idempotent via a match `sig`.
