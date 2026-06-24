# Ball Knowledge — Master Development Plan

> **Single source of truth** for scaling Ball Knowledge from concept to a polished,
> feature-complete, production-ready PWA. Refer back to this document for every
> architectural and roadmap decision.

**Document owner:** Lead Software Architect & Product Manager
**Status:** Living document — update as phases complete.

---

## Product Snapshot

| Dimension | Decision |
|---|---|
| **Core concept** | Real-time 1v1 European football knowledge duel |
| **Match format** | 10 questions per match, drawn from 6 distinct mini-games |
| **Scoring model** | Trivia accuracy converts into a live football scoreline (e.g. *Sara FC 3–2 Jonas United*) |
| **Tech stack** | React + TypeScript + Vite + Tailwind CSS |
| **Offline** | Fully playable vs a locally simulated CPU — no network required |
| **Online** | Real-time multiplayer via Ably **or** Supabase, activated only when env API keys are present |
| **Visual direction** | High-end dark theme, neon-green accents, clean typography, custom Tailwind gradients, subtle SVG pitch layouts, sharp UI icons |
| **Asset policy** | **Zero** copyrighted club logos, player photos, or external media. Everything is typographic, SVG, or CSS-generated. |

> ⚠️ **Current repository reality:** As of this plan, the repo contains only `README.md`.
> There is **no existing code to refactor** — this is a greenfield build. That is a
> feature, not a bug: we get to lock in the architecture below *before* gameplay code
> accumulates. The "Audit" section is therefore framed as the **target architecture**
> and the rules we commit to, not a critique of existing code.

---

## 1. Architecture & State Management Audit

### 1.1 Guiding principle: one match is a finite state machine

A match is not a pile of `useState` flags — it is a **finite state machine (FSM)** with a
small, enumerable set of states and legal transitions. Modelling it explicitly is the
single most important decision in the codebase because it makes offline (CPU) and online
(real-time) flows share **exactly one** code path, differing only in *who supplies the
opponent's events*.

```
        ┌─────────────┐
        │  MAIN_MENU  │
        └──────┬──────┘
       select mode (CPU | Online)
   ┌───────────┴────────────┐
   ▼                        ▼
┌──────────────┐     ┌────────────────┐
│ CPU_MATCHMAKE│     │ ONLINE_MATCHMAKE│  (find opponent / room)
└──────┬───────┘     └───────┬─────────┘
       └───────────┬─────────┘
                   ▼
            ┌─────────────┐
            │  COUNTDOWN  │  (3…2…1 — kickoff)
            └──────┬──────┘
                   ▼
        ┌──────────────────────┐
        │  IN_QUESTION (q n/10)│◄──┐
        └──────┬───────────────┘   │ next question
               ▼                   │
        ┌──────────────┐           │
        │ QUESTION_REVEAL│─────────┘  (show correct answer + score delta)
        └──────┬───────┘
               ▼  (after question 10)
        ┌──────────────┐
        │  TIEBREAKER  │  (only if scores level)
        └──────┬───────┘
               ▼
        ┌──────────────┐
        │ POST_MATCH   │  (final scoreline, stats, rematch)
        └──────┬───────┘
               ▼  rematch / exit
          MAIN_MENU
```

**States** (single discriminated union, never booleans):

```ts
type MatchPhase =
  | { kind: 'main_menu' }
  | { kind: 'matchmaking'; mode: GameMode }
  | { kind: 'countdown'; secondsLeft: number }
  | { kind: 'in_question'; index: number; miniGame: MiniGameId; deadline: number }
  | { kind: 'question_reveal'; index: number; result: QuestionResult }
  | { kind: 'tiebreaker'; round: number }
  | { kind: 'post_match'; summary: MatchSummary };

type GameMode = 'cpu' | 'online';
```

### 1.2 The transport abstraction (offline/online unification)

The FSM must be **transport-agnostic**. We define one interface; the FSM only ever talks
to *this*, never to Ably/Supabase/CPU directly.

```ts
// The match engine emits intents and subscribes to opponent events through this.
interface MatchTransport {
  readonly mode: GameMode;
  send(event: PlayerEvent): void;                 // my answer, my readiness, etc.
  subscribe(handler: (e: OpponentEvent) => void): () => void; // unsubscribe fn
  disconnect(): void;
}
```

- `LocalCpuTransport` — synthesises `OpponentEvent`s from a CPU difficulty model
  (answer accuracy %, response-time distribution). Pure, deterministic-with-seed, testable.
- `AblyTransport` / `SupabaseTransport` — wrap the respective real-time SDK, translating
  channel messages into the *same* `OpponentEvent` shape.

A **factory** selects the implementation at runtime:

```ts
function createTransport(mode: GameMode, env: RuntimeEnv): MatchTransport {
  if (mode === 'cpu') return new LocalCpuTransport(env.cpuDifficulty);
  if (env.ABLY_KEY) return new AblyTransport(env.ABLY_KEY);
  if (env.SUPABASE_URL) return new SupabaseTransport(env);
  // No keys → online unavailable; UI should have already hidden the option.
  throw new MatchError('ONLINE_UNAVAILABLE');
}
```

> **Why this matters:** the gameplay loop, scoring, timeline, and commentary code never
> branch on `cpu` vs `online`. We test 100% of game logic offline, and online becomes
> "just another transport."

### 1.3 React state layout — three concerns, three homes

| Concern | Where it lives | Why |
|---|---|---|
| **Match engine state** (FSM, scores, current question) | A reducer driven by `useMatchEngine` hook, exposed via a single `MatchProvider` context | One source of truth, predictable transitions, easy to unit-test the reducer in isolation |
| **Cross-cutting app state** (settings, audio on/off, theme, player profile name) | A lightweight `AppSettingsProvider` context, persisted to `localStorage` | Survives reloads, independent of any match |
| **Ephemeral view state** (hover, input focus, local animation) | Plain `useState` inside the leaf component | Never promote local UI state to context — keep re-renders narrow |

**Avoid** a single mega-context. Two providers (`AppSettings`, `Match`) plus local state is
the right granularity. If `MatchProvider` re-renders become a perf issue, split read vs
dispatch contexts (state context + dispatch context) so action-only consumers don't re-render.

### 1.4 The reducer + action contract

```ts
type MatchAction =
  | { type: 'MENU/SELECT_MODE'; mode: GameMode }
  | { type: 'MATCH/OPPONENT_FOUND'; opponent: OpponentInfo }
  | { type: 'MATCH/COUNTDOWN_TICK' }
  | { type: 'QUESTION/START'; index: number; miniGame: MiniGameId; payload: MiniGamePayload }
  | { type: 'QUESTION/SUBMIT_ANSWER'; answer: AnswerValue; elapsedMs: number }
  | { type: 'QUESTION/OPPONENT_ANSWERED'; result: AnswerOutcome }
  | { type: 'QUESTION/REVEAL' }
  | { type: 'MATCH/NEXT_QUESTION' }
  | { type: 'MATCH/ENTER_TIEBREAKER' }
  | { type: 'MATCH/COMPLETE'; summary: MatchSummary }
  | { type: 'MATCH/ERROR'; error: MatchError }
  | { type: 'MATCH/RESET' };
```

The reducer is a **pure function** `(state, action) => state`. All side effects
(transport sends, timers, real-time subscriptions) live in `useMatchEngine`'s effects,
which *dispatch* actions in response to transport events. This keeps the FSM testable
without React.

### 1.5 TypeScript type-safety across real-time payloads

Real-time is where types rot fastest. Rules we commit to:

1. **Single shared payload module** — `src/types/realtime.ts` defines every wire event
   as a discriminated union keyed by `t` (type tag). The CPU transport, Ably transport,
   and Supabase transport all import these *same* types.

   ```ts
   type PlayerEvent =
     | { t: 'ready'; matchId: string }
     | { t: 'answer'; questionIndex: number; answer: AnswerValue; elapsedMs: number }
     | { t: 'rematch_request' };

   type OpponentEvent =
     | { t: 'opponent_ready' }
     | { t: 'opponent_answer'; questionIndex: number; outcome: AnswerOutcome }
     | { t: 'opponent_left' }
     | { t: 'rematch_offered' };
   ```

2. **Runtime validation at the boundary** — wire data is `unknown` until proven. Use a
   tiny schema validator (Zod, or hand-rolled type guards to keep bundle small) to parse
   inbound messages *before* they enter the reducer. A malformed payload becomes a
   `MATCH/ERROR`, never a crash.

3. **Versioned protocol** — include a `v` field on the channel handshake so we can evolve
   the wire format without breaking players on older bundles.

4. **No `any` at transport seams** — `subscribe(handler: (e: OpponentEvent) => void)` is
   fully typed; the cast happens exactly once, inside the validator.

### 1.6 Error handling & resilience (designed in, not bolted on)

| Failure | Strategy |
|---|---|
| Opponent disconnects mid-match | Online transport emits `opponent_left`; FSM offers "claim win / play CPU from here" |
| Real-time send fails | Optimistic local apply + retry with backoff; if unrecoverable → `MATCH/ERROR` and graceful degrade |
| Malformed payload | Rejected by validator → logged, ignored or surfaced as soft error |
| Timer drift / tab backgrounded | Deadlines stored as absolute timestamps (`deadline: number`), recomputed on focus — never rely on `setInterval` accuracy |
| No API keys but user picks online | Online entry hidden at menu; factory throw is a guard-rail, not a UX path |

A top-level `<MatchErrorBoundary>` catches render-time failures and routes back to the menu
with a friendly message — a match crash must never blank the whole app.

### 1.7 Target folder structure

```
src/
  app/
    App.tsx
    providers/
      AppSettingsProvider.tsx
      MatchProvider.tsx
  engine/
    matchReducer.ts          # pure FSM
    useMatchEngine.ts        # reducer + effects + transport wiring
    scoring.ts               # accuracy → scoreline conversion
    cpu/
      LocalCpuTransport.ts
      cpuDifficulty.ts
  transport/
    MatchTransport.ts        # interface
    AblyTransport.ts
    SupabaseTransport.ts
    createTransport.ts       # factory
  minigames/
    registry.ts              # MiniGameId → engine map (Phase 2)
    MiniGameShell.tsx        # shared frame for all 6
    types.ts
    <each-mini-game>/...
  ui/
    pitch/PitchSvg.tsx
    scoreboard/Scoreboard.tsx
    timeline/MatchTimeline.tsx
    commentary/CommentaryTicker.tsx
    theme/teamThemes.ts
  types/
    realtime.ts              # shared wire types
    match.ts
  lib/
    validate.ts              # payload guards
    storage.ts               # localStorage helpers
    rng.ts                   # seedable RNG for deterministic CPU/tests
```

---

## 2. The 4-Phase Implementation Roadmap

Each phase is shippable on its own. We do not start a phase until the previous one is
green (tests pass, app runs). Milestones are checkboxes so this doc doubles as a tracker.

### Phase 0 (pre-work, ~half a session): Project bootstrap

Not in the original four, but required before Phase 1 because the repo is empty.

- [ ] `npm create vite@latest` (React + TS template), add Tailwind, configure dark theme tokens
- [ ] ESLint + Prettier + `tsconfig` strict mode (`strict: true`, `noUncheckedIndexedAccess: true`)
- [ ] Vitest + React Testing Library wired up; one smoke test green
- [ ] Folder skeleton from §1.7 committed (empty stubs OK)
- [ ] `.env.example` documenting `VITE_ABLY_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

**Files created:** `package.json`, `vite.config.ts`, `tailwind.config.ts`, `tsconfig.json`,
`.eslintrc`, `src/main.tsx`, `src/app/App.tsx`, `.env.example`

---

### Phase 1: Game Loop & State Hardening

**Goal:** rock-solid offline/online state transitions, tiebreakers, and robust error
handling — with a *single placeholder* mini-game so we can exercise the full loop end-to-end.

**Key milestones**
- [ ] `matchReducer.ts` implementing the full FSM (§1.1) with unit tests for every transition
- [ ] `MatchTransport` interface + `LocalCpuTransport` (seedable, difficulty-driven)
- [ ] `useMatchEngine` hook wiring reducer ↔ transport ↔ timers (absolute-deadline timers)
- [ ] `scoring.ts` — accuracy-to-scoreline algorithm + tiebreaker rules, fully unit-tested
- [ ] `MatchProvider` + `AppSettingsProvider` contexts
- [ ] One placeholder mini-game (simple multiple-choice) to drive 10 questions end-to-end
- [ ] `<MatchErrorBoundary>` + error-path UX (disconnect, malformed payload, timeout)
- [ ] Full CPU match playable start→finish, including a forced-tie → tiebreaker path
- [ ] Payload validator (`lib/validate.ts`) + `types/realtime.ts` shared union

**Files created/modified:** `engine/matchReducer.ts`, `engine/useMatchEngine.ts`,
`engine/scoring.ts`, `engine/cpu/LocalCpuTransport.ts`, `transport/MatchTransport.ts`,
`transport/createTransport.ts`, `app/providers/*`, `types/realtime.ts`, `types/match.ts`,
`lib/validate.ts`, `lib/rng.ts`

**Exit criteria:** A full 10-question CPU match plays flawlessly offline, ties resolve via
tiebreaker, and yanking the (mock) connection mid-match degrades gracefully. ≥90% reducer
branch coverage.

---

### Phase 2: The 6 Mini-Game Engines

**Goal:** a clean, modular template so adding/refactoring any text-and-data-driven
mini-game is effortless. The match engine must treat all six **uniformly**.

**The mini-game contract** (every game implements this):

```ts
interface MiniGame<TPayload, TAnswer> {
  id: MiniGameId;
  title: string;
  generate(rng: Rng, difficulty: Difficulty): TPayload;   // build a question
  score(payload: TPayload, answer: TAnswer): AnswerOutcome; // correctness + speed
  cpuAnswer(payload: TPayload, skill: number, rng: Rng): TAnswer; // CPU's pick
  Component: React.FC<MiniGameProps<TPayload, TAnswer>>;  // renders inside shell
}
```

- A **`registry.ts`** maps `MiniGameId → MiniGame`. The match engine asks the registry
  for a game, calls `generate`, renders `Component` inside `MiniGameShell`, and reads back
  an `AnswerOutcome` via `score`. **Adding a 7th game later = add one folder + one registry
  entry.** Zero changes to the engine.
- `MiniGameShell.tsx` owns the shared chrome: question counter, timer ring, score strip,
  submit affordance — so individual games only render their unique body.

**The 6 mini-games (text/data-driven — no media):**
1. **Multiple Choice** — "Which club won the 2005 Champions League?" 4 typographic options.
2. **Higher / Lower** — compare two data points (e.g. trophy counts, league titles).
3. **Career Path** — a club/transfer sequence rendered as an SVG timeline; name the player.
4. **Odd One Out** — pick the item that doesn't belong (e.g. one non-winner among winners).
5. **Guess the Year** — slider/stepper input; closeness scoring rewards near-misses.
6. **True / False (Rapid Fire)** — fast binary calls under a tight clock.

**Key milestones**
- [ ] `MiniGame` interface + `MiniGameProps` + `MiniGameShell.tsx`
- [ ] `registry.ts` + `MiniGameId` union
- [ ] Each of the 6 games as an isolated module with its own unit tests (`generate`/`score`/`cpuAnswer`)
- [ ] A typed **question bank** (`data/`) — pure JSON/TS data, validated at build, no media
- [ ] Difficulty tuning per game; CPU `cpuAnswer` calibrated against skill levels
- [ ] Engine picks a varied, non-repeating sequence of 10 across the 6 games

**Files created/modified:** `minigames/types.ts`, `minigames/registry.ts`,
`minigames/MiniGameShell.tsx`, `minigames/<game>/index.tsx` ×6, `data/questionBank.ts`,
plus the engine swap from Phase 1's placeholder to the registry-driven selector.

**Exit criteria:** All 6 games playable vs CPU, each independently unit-tested, and a match
can draw any mix of them without engine changes.

---

### Phase 3: The Match Immersion & UI/UX Layer

**Goal:** "app-like" polish — custom team color themes, match timeline progression, and
dynamic live text commentary. This is the layer that makes trivia *feel* like football.

**Key milestones**
- [ ] **Team color themes** — each player gets a generated team identity (name + two-color
      palette). `teamThemes.ts` derives Tailwind CSS variables; the whole UI tints to the
      active player. Deterministic from a seed so rematches stay consistent.
- [ ] **Scoreboard** — live "Sara FC 3–2 Jonas United" with animated score changes on each
      correct answer (number roll / goal flash).
- [ ] **Match timeline progression bar** — a horizontal pitch-minute bar (1'→90') mapping
      the 10 questions to match minutes; goals plotted as markers.
- [ ] **Commentary ticker** — a `CommentaryEngine` that generates contextual text lines
      ("GOAL! Sara strikes on the counter after a crisp answer!") from match events. Pure
      function of event + state; pooled templates with variable slots, no external data.
- [ ] **SVG pitch layouts** — subtle animated pitch background, possession/momentum hints.
- [ ] **Transitions & micro-interactions** — countdown kickoff, question reveal, half-time,
      full-time whistle; respect `prefers-reduced-motion`.
- [ ] **Sound (optional, generated)** — short synthesized cues (Web Audio), toggleable, no
      copyrighted audio files.
- [ ] Responsive layout pass — mobile-first, thumb-reachable controls.

**Files created/modified:** `ui/theme/teamThemes.ts`, `ui/scoreboard/Scoreboard.tsx`,
`ui/timeline/MatchTimeline.tsx`, `ui/commentary/CommentaryTicker.tsx`,
`ui/commentary/commentaryEngine.ts`, `ui/pitch/PitchSvg.tsx`, transition/animation utils,
plus `tailwind.config.ts` theme-token additions.

**Exit criteria:** A match is visually immersive end-to-end on mobile and desktop;
commentary and timeline react correctly to every scoring event; reduced-motion honored.

---

### Phase 4: Optimization, Deployment & PWA Readiness

**Goal:** production-ready — fast, installable, offline-capable on mobile.

**Key milestones**
- [ ] **Tailwind purge / content config** verified — ship only used classes; audit final CSS size
- [ ] **Bundle optimization** — route/feature code-splitting (lazy-load online transports so
      Ably/Supabase SDKs aren't in the offline bundle), tree-shaking audit, analyze with
      `rollup-plugin-visualizer`
- [ ] **PWA** — `vite-plugin-pwa`: web app manifest (name, neon-green theme color, generated
      SVG/maskable icons), installable on mobile
- [ ] **Service worker / asset caching** — precache the app shell + question bank so CPU play
      works fully offline after first load; network-first for real-time only
- [ ] **Performance budget** — Lighthouse CI target (Perf ≥ 90, PWA installable, a11y ≥ 95)
- [ ] **Accessibility pass** — keyboard nav, focus management across FSM transitions, ARIA on
      live regions (scoreboard/commentary), color-contrast on neon accents
- [ ] **CI/CD** — GitHub Actions: typecheck + lint + test + build on PR; deploy to static host
      (Netlify/Vercel/GitHub Pages) on merge
- [ ] **Env-key wiring in prod** — online lights up only when `VITE_ABLY_KEY` / Supabase vars
      are configured in the host; documented in README

**Files created/modified:** `vite.config.ts` (PWA plugin, code-split, visualizer),
`public/manifest` + generated icons, `tailwind.config.ts` content paths,
`.github/workflows/ci.yml`, `README.md` deployment + env docs.

**Exit criteria:** Lighthouse PWA-installable and Perf ≥ 90, full offline CPU play after
first load, CI green on every PR, one-click production deploy.

---

## 3. Cross-Cutting Standards (apply in every phase)

- **TypeScript strict** everywhere; no `any` except a single audited cast in the payload validator.
- **Pure logic is React-free** — reducers, scoring, mini-game `generate`/`score`, commentary
  engine are all testable without rendering.
- **Determinism via seeded RNG** — every random draw flows through `lib/rng.ts` so matches
  and tests are reproducible.
- **No media assets, ever** — enforce with a lint rule / CI check that rejects image/audio
  imports outside `public/icons` (generated SVG only).
- **Mobile-first & a11y-first** — not a Phase 4 afterthought; check on every UI PR.

---

## 4. Immediate Next Steps (next coding session)

Of the entire plan, the **two specific tasks** to tackle first — both from Phase 0 → Phase 1,
because nothing else can be built until the skeleton and the FSM exist:

### ✅ Task 1 — Bootstrap the Vite + React + TS + Tailwind project (Phase 0)
Stand up the actual app: `npm create vite` (React-TS), add and configure Tailwind with the
dark-theme + neon-green design tokens, enable `tsconfig` strict mode, wire Vitest + RTL with
one green smoke test, and commit the §1.7 folder skeleton (empty stubs) plus `.env.example`.
**Why first:** the repo is empty; there is literally no app to iterate on yet. This unblocks
everything.

### ✅ Task 2 — Implement the match FSM core: `matchReducer.ts` + shared types (Phase 1)
Write the pure `matchReducer` covering the full state machine in §1.1, the `MatchAction`
union, and the shared `types/realtime.ts` + `types/match.ts`. Cover it with unit tests for
every legal transition (and a few illegal ones that must be rejected). **Why second:** the
FSM is the spine the entire game hangs off — locking it down early means offline, online,
all 6 mini-games, scoring, and UI all plug into a stable, tested contract instead of chasing
a moving target.

> After these two, Phase 1 continues with `LocalCpuTransport` and `scoring.ts`, at which point
> a placeholder match is playable end-to-end and the roadmap is genuinely in motion.

---

*End of Master Development Plan. Update milestone checkboxes as work lands; treat any
architectural deviation as a PR that also edits this file.*
