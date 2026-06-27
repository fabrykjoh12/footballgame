# CLAUDE.md

Guidance for working in this repository. Read [`ROADMAP.md`](./ROADMAP.md) for the
phased plan and architectural rationale — it is the single source of truth.

## What this is

**Ball Knowledge** — a real-time 1v1 European football knowledge duel. Ten questions
drawn from six mini-games; trivia accuracy is converted into a live football scoreline
(e.g. *Sara FC 3–2 Jonas United*). Fully playable offline vs a CPU; online multiplayer
is gated behind env keys (scaffolded, not yet implemented).

Stack: **React 18 · TypeScript (strict) · Vite · Tailwind CSS · Vitest**.

## Commands

```bash
npm install
npm run dev         # dev server
npm test            # vitest (run once)
npm run test:watch  # vitest watch
npm run typecheck   # tsc --noEmit (strict)
npm run build       # tsc -b && vite build (emits PWA sw.js + manifest)
npm run preview     # serve the production build (to sanity-check the SW/PWA)
```

Always run `npm run typecheck && npm test && npm run build` before committing.

## Architecture (the load-bearing ideas)

1. **A match is a finite state machine.** `src/engine/matchReducer.ts` is a *pure*
   reducer: `main_menu → matchmaking → countdown → in_question ⇄ question_reveal →
   (half_time at 5/10) → … → tiebreaker? → post_match`, plus an `error` phase. It has no
   side effects and is unit-tested across legal *and* illegal transitions.

2. **One code path for offline and online.** The reducer/engine never branch on
   `cpu` vs `online`. The only difference is which **`MatchTransport`**
   (`src/transport/MatchTransport.ts`) supplies opponent events. `LocalCpuTransport`
   simulates an opponent; Ably/Supabase transports plug into the same interface via
   `createTransport`. If you add behaviour, keep it transport-agnostic.

3. **Effects live in the hook, not the reducer.** `src/engine/useMatchEngine.tsx`
   owns timers, transport wiring, and question generation, translating transport events
   into reducer actions. Timers use **absolute epoch-ms deadlines** so they survive tab
   backgrounding. It must stay idempotent under React StrictMode (note the `startedRef`
   / `answeredRef` guards).

4. **Mini-games are uniform and pluggable.** Every game implements the `MiniGame`
   contract (`src/minigames/types.ts`): `generate / score / cpuAnswer / Component`.
   `src/minigames/registry.ts` maps `MiniGameId → MiniGame`. **Adding a 7th game is one
   folder + one registry entry — zero engine changes.** Game logic is pure and tested
   separately from rendering.

5. **Real-time type safety.** All wire events live in `src/types/realtime.ts` as
   discriminated unions. Inbound data is `unknown` until validated by
   `src/lib/validate.ts` (the single audited cast in the codebase). A malformed payload
   becomes a soft `MATCH/ERROR`, never a crash.

6. **Determinism via seeded RNG.** Every random draw flows through `src/lib/rng.ts`
   so matches and tests are reproducible. Don't call `Math.random()` for game logic.

## Layout

```
src/
  engine/      matchReducer (FSM), scoring, useMatchEngine, useMatchSound, setupMatch, cpu/
  transport/   MatchTransport interface + createTransport factory
  minigames/   types (contract), registry, MiniGameShell, <game>/, data/ (question banks)
  ui/          scoreboard, timeline, commentary, pitch SVG, theme (team colours)
  app/         providers (settings/match), screens, a11y (ScreenAnnouncer), App router
  types/       match.ts (domain), realtime.ts (wire protocol)
  lib/         rng, validate, sound (Web Audio), storage, useOnlineStatus
```

## Conventions & guardrails

- **Strict TypeScript.** No `any` except the one audited cast in `validate.ts`.
  `noUncheckedIndexedAccess` is on — array access is `T | undefined`.
- **Pure logic is React-free.** Reducers, scoring, mini-game `generate`/`score`,
  commentary, and `describePhase` are all unit-testable without rendering. New logic
  should follow suit and ship with tests (co-located `*.test.ts(x)`).
- **🚫 Zero media assets.** No club logos, player photos, audio files, or external
  images — ever. Visuals are typography, SVG, and CSS gradients; sound is synthesized at
  runtime (`src/lib/sound.ts`); icons are generated SVGs in `public/`. Keep it that way.
- **Accessibility.** Honour `prefers-reduced-motion` (handled globally in `index.css`),
  keep live regions working (`ScreenAnnouncer`, commentary), and give controls accessible
  names.
- **Imports use explicit extensions** (`./foo.ts` / `./foo.tsx`) per the bundler config;
  `@/` is aliased to `src/`.
- **Tests** are co-located and use Vitest + Testing Library (jsdom). Prefer testing pure
  functions and reducer transitions over rendering whole flows.

## Git

- Develop on a feature branch; `main` is the deploy branch.
- Run the full check (`typecheck && test && build`) before committing.
- Don't commit build artifacts (`dist/`, `*.tsbuildinfo` are gitignored).
