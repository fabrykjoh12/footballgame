# Ball Knowledge ⚽🧠

A real-time **1v1 European football knowledge duel**. Ten questions across six
mini-games, with trivia accuracy converted into a live football-style scoreline
(e.g. _Sara FC 3–2 Jonas United_).

- **Offline-first:** fully playable vs a locally simulated CPU — no network, no keys.
- **Online-ready:** real-time multiplayer activates when Ably/Supabase keys are present.
- **Zero copyrighted assets:** every visual is typography, SVG, or CSS gradient.

> See [`ROADMAP.md`](./ROADMAP.md) for the phased Master Development Plan and
> architecture rationale. This is the single source of truth for the build.

## Tech stack

React · TypeScript (strict) · Vite · Tailwind CSS · Vitest

## Getting started

```bash
npm install
npm run dev        # start the dev server
npm test           # run the unit test suite
npm run typecheck  # strict type checking
npm run build      # production build
```

Copy `.env.example` to `.env` to configure online play (optional). With no keys,
the app runs fully offline against the CPU.

## Architecture at a glance

A match is a **finite state machine** (`src/engine/matchReducer.ts`) — a pure
reducer that offline and online play share. The only difference between a CPU
match and an online match is which **transport** (`src/transport/`) supplies the
opponent's events; gameplay logic never branches on the mode.

```
src/
  engine/      # pure FSM, scoring, CPU model, the useMatchEngine hook
  transport/   # MatchTransport interface + factory (CPU now, Ably/Supabase next)
  minigames/   # the MiniGame contract, registry, shell, and game modules
  ui/          # scoreboard, timeline, commentary, pitch SVG, team themes
  app/         # providers, screens, error boundary, the phase router
  types/       # shared domain + wire-protocol types
  lib/         # seeded RNG, payload validation
```

### Current status

- **Phase 0 (bootstrap)** ✅ — Vite + TS strict + Tailwind + Vitest.
- **Phase 1 (game loop hardening)** ✅ — full FSM, CPU transport, scoring,
  tiebreakers, error handling, and a playable end-to-end CPU match.
- **Phase 2 (the 6 mini-game engines)** ✅ — all six implemented against one
  `MiniGame` contract: Multiple Choice, Higher/Lower, Career Path, Odd One Out,
  Guess the Year (closeness-scored), and True/False. Adding a seventh is a folder
  + a registry entry — zero engine changes.
- **Phase 3 (immersion UI/UX)** ✅ (mostly) — team themes, animated scoreboard,
  match timeline, momentum bar, live commentary, a half-time interstitial, and
  synthesized Web Audio cues (toggleable, no audio files). A deeper responsive
  audit remains.
- **Phase 4 (PWA/optimization)** ◻️ — installability, offline asset caching, and
  bundle/code-split work are scoped in the roadmap.
