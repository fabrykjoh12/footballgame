# CLAUDE.md

Guidance for Claude Code (and humans) working in this repo. This reflects the
**current** state of the project so a fresh session can continue seamlessly.

## What this is

**Ball Knowledge** — a real-time 1v1 football (soccer) knowledge duel.
Two players join a room with a short code and play a **10-question match** built
from **seven mini-games**. Points convert into **goals** for a football-style
score ("Sara FC 3–2 Jonas United"). React + TypeScript + Vite + Tailwind.
Fully playable offline vs a CPU; real-time multiplayer via Ably (or Supabase)
when keys are present.

Built and working: 7 mini-games, **272 questions**, live Ably 1v1 (verified +
hardened), Daily Challenge, local profile/stats, sound, share-as-image,
live commentary, a 0–90' match timeline, **sudden-death stoppage time**, a
lobby topic filter, deterministic per-team kit colours, a premium UI pass, and
**83 unit tests** gating an auto-deploy pipeline.

> "Football" always means **European football / soccer**. Never use real club
> badges or player photos — visuals are gradients, pitch patterns, icons, type.

## Commands

```bash
npm install
npm run dev      # dev server at http://localhost:5173
npm run build    # tsc -b && vite build  (ALWAYS run before committing UI/logic)
npm run build:pages  # tsc -b && vite build --base=./  (relative base for Pages)
npm run preview  # serve the production build
npm run lint     # tsc --noEmit (type-check only)
npm test         # vitest run (83 tests across lib/, data/, services/)
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
(`createRoom`, `joinRoom`, `playDemo`, `playDaily`, `updateSettings`,
`startMatch`, `submitAnswer`, `nextQuestion`, `rematch`, `leaveRoom`) via the
`useGame()` hook. `src/App.tsx` routes screens purely off `room.status`
(`lobby → starting/in_question/showing_result → finished`); `AppShell` is inside
the provider and shows a global connection banner.

```
HomePage → LobbyPage → GamePage (MatchTimeline / Scoreboard / CommentaryTicker /
           QuestionCard / ResultReveal / GoalAnimation) → FinalResult
```

## The seven mini-games

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

Per-match mix (10 Qs): `who_am_i ×3, career_path ×2, higher_lower ×1,
club_country ×1, guess_year ×1, transfer_fee ×1, pitch_position ×1`
(`MATCH_TYPE_DISTRIBUTION` in `matchModes.ts`).

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
| Question database (272 Qs, 7 types) | `src/data/questions.ts` |
| Match modes (Casual/Serious/Nightmare) | `src/lib/matchModes.ts` |
| Daily Challenge + seeded RNG (deterministic per-day match) | `src/lib/dailyChallenge.ts`, `src/lib/seededRandom.ts` |
| Local profile / lifetime stats | `src/lib/profileStats.ts` |
| Live commentary text generator (pure) | `src/lib/commentary.ts` |
| Deterministic per-team kit colours | `src/lib/teamIdentity.ts` |
| Pitch zones constant | `src/lib/positions.ts` |
| Sound (Web Audio, synth, no files) | `src/lib/sound.ts` |
| Share: canvas matchday card / copy-paste text | `src/lib/shareImage.ts`, `src/lib/shareResult.ts` |
| Realtime connection-state mapping (pure) | `src/services/connectionMapping.ts` |
| Realtime env detection (SDK-free) | `src/lib/realtimeConfig.ts` |
| Components | `src/components/{layout,home,lobby,game,ui}` |
| Styling tokens / animations | `tailwind.config.js`, `src/styles/globals.css` |

## Features built this far

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

11 test files (`npm test`, 83 tests): `scoring`, `questionPicker` (distribution,
difficulty, anti-bias shuffle, determinism, topic filter), `questions` (data
integrity invariants above), `matchEngine` (lifecycle, scoring, **sudden death**,
timeout) with fake timers, `commentary`, `teamIdentity`, `connectionMapping`,
`dailyChallenge`, `seededRandom`, `shareResult`, `profileStats`. Add a test when
you add an invariant or a rule.

## Realtime / env

Env vars (build-time, `VITE_` prefixed; see `.env.example`):

- `VITE_ABLY_API_KEY` — enables Ably multiplayer (preferred).
- `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` — enables Supabase multiplayer.

No keys → demo mode (vs CPU) everywhere. Setup guides: `ABLY_SETUP.md`,
`SUPABASE_SETUP.md`. **Status:** demo + local loop verified; **live Ably 1v1
verified** across two devices, with disconnect/reconnect handling, lobby-slot
release on leave, and guest-side countdown rebasing to neutralise clock skew
(see `ablyGameService.ts`). The Supabase path is built but **not yet
device-tested**.

## Deployment — auto-deploy via GitHub Actions

`.github/workflows/deploy.yml` ("Deploy preview") runs on **push to `main` or
`claude/**`** (and `workflow_dispatch`): `npm ci` → `npm test` → `npm run
build:pages` (with the `VITE_ABLY_API_KEY` secret) → publishes `./dist` to the
**`gh-pages`** branch (`peaceiris/actions-gh-pages`). Live at
`https://fabrykjoh12.github.io/footballgame/` (Pages → deploy from `gh-pages`).
Tests must pass or the deploy is blocked. To enable live multiplayer on the
deploy, add the `VITE_ABLY_API_KEY` repo secret (Settings → Secrets → Actions).

Gotchas:
- **Base path:** Project Pages serve under `/footballgame/`; we build with
  `--base=./` (relative). A plain `npm run build` (base `/`) white-screens on Pages.
- The repo-root `index.html` is the Vite **dev** template (references
  `/src/main.tsx`); it includes a loading fallback for bundle-load failures.
- `import.meta.env`, `Date.now()` etc. are fine in-app but unavailable in plain
  Node — don't import app modules into ad-hoc Node scripts; run via `tsx`.

## Status & open items

- ✅ Done: 7 mini-games, 272 Qs, live Ably 1v1 + hardening, Daily Challenge,
  profile/stats, sound, share (image+text), commentary, timeline, sudden death,
  topic filter, kit colours, premium UI across all screens, 83 tests + CI.
- ⏳ Open: **online leaderboard** (needs a backend — Supabase; daily/stats are
  local only). **Supabase multiplayer path** built but not device-tested. A
  full **two-device multiplayer playtest** of the newer features is still owed.

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
