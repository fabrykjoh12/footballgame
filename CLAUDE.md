# CLAUDE.md

Guidance for Claude Code (and humans) working in this repo.

## What this is

**Ball Knowledge** — a real-time 1v1 football (soccer) knowledge duel.
Two players join a room with a short code and play a 10-question match built
from five mini-games. Points convert into **goals** for a football-style score
("Sara FC 3–2 Jonas United"). React + TypeScript + Vite + Tailwind. Fully
playable offline vs a CPU; real-time multiplayer via Ably or Supabase when keys
are present.

> "Football" always means **European football / soccer**. Never use real club
> badges or player photos — visuals are gradients, pitch patterns, icons, type.

## Commands

```bash
npm install
npm run dev      # dev server at http://localhost:5173
npm run build    # tsc -b && vite build  (ALWAYS run before committing UI/logic)
npm run preview  # serve the production build
npm run lint     # tsc --noEmit (type-check only)
```

There is no test runner yet and no ESLint config — `npm run build` (strict
`tsc`) is the gate. Keep it green.

## Architecture (read this first)

The UI never talks to a backend directly. It talks to the **`GameService`**
interface (`src/types/game.ts`). Three implementations are swapped by a factory:

- `LocalGameService` — offline, opponent is a bot (`botPlayer.ts`).
- `AblyGameService` — real-time via Ably channels.
- `SupabaseGameService` — real-time via Supabase Realtime broadcast.

`src/services/gameService.ts` is the factory: `createGameService(intent)` returns
local for `'demo'`, otherwise the configured remote backend (Ably preferred),
lazily `import()`-ed so the SDKs are **code-split out of the main bundle**.

All three remote/local paths share one authoritative state machine:

- **`src/services/matchEngine.ts`** owns the single `Room`, runs all timers
  (question countdown, result auto-advance), applies scoring, and emits a fresh
  `Room` snapshot on every transition. **In multiplayer, only the HOST runs the
  engine** and broadcasts snapshots; guests render snapshots and send their
  actions (join / answer) back to the host.

React wiring: `src/context/GameProvider.tsx` subscribes to the active service
and exposes `room`, `localPlayer`, `opponent`, and actions via the `useGame()`
hook. `src/App.tsx` routes screens purely off `room.status`
(`lobby → starting/in_question/showing_result → finished`).

```
HomePage → LobbyPage → GamePage (QuestionCard / ResultReveal / GoalAnimation) → FinalResult
```

## Where things live

| Area | Path |
| --- | --- |
| Domain types (source of truth) | `src/types/game.ts` |
| Scoring & football-event rules (pure) | `src/lib/scoring.ts` |
| Question selection (per-type mix, difficulty, answer-position randomize) | `src/lib/questionPicker.ts` |
| Question database (176 Qs, 5 types) | `src/data/questions.ts` |
| Match modes (Casual/Serious/Nightmare) | `src/lib/matchModes.ts` |
| Realtime env detection (SDK-free) | `src/lib/realtimeConfig.ts` |
| Components | `src/components/{layout,home,lobby,game,ui}` |
| Styling tokens / animations | `tailwind.config.js`, `src/styles/globals.css` |

## Conventions

- **Game rules live in `lib/`, never in components.** Components read state and
  call actions; they don't compute scores or own game logic.
- TypeScript strict mode; `noUnusedLocals`/`noUnusedParameters` are on.
- Keep components small and typed. Discriminated unions over `any`.
- Correct/wrong states must not rely on colour alone (icons + text); keep
  buttons real `<button>`s with aria labels. Mobile-first.
- Tailwind for styling; custom tokens (`pitch`, `ink`, `gold`), helpers
  (`.glass`, `.text-gradient-pitch`, `.answer-press`) and keyframes are defined
  in `tailwind.config.js` / `globals.css`.

## Adding content

- **New question:** append to `src/data/questions.ts` matching the relevant
  `Question` variant. Multiple-choice types need exactly 4 `options` and a
  `correctAnswer` that is character-for-character one of them. For
  `higher_lower`, `correctAnswer` must equal the side whose `value` satisfies
  the prompt; values are approximate-but-direction-stable (see file header).
- **New mini-game type:** add a variant to the `Question` union
  (`types/game.ts`), handle it in `scoring.ts` + `questionPicker.ts`, and add a
  branch in `QuestionCard.tsx` and `ResultReveal.tsx`.

## Realtime / env

Env vars (build-time, `VITE_` prefixed; see `.env.example`):

- `VITE_ABLY_API_KEY` — enables Ably multiplayer (preferred).
- `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` — enables Supabase multiplayer.

No keys → demo mode (vs CPU) everywhere. Setup guides: `ABLY_SETUP.md`,
`SUPABASE_SETUP.md`. **Status:** demo + local loop are verified; the live
multiplayer paths are built but not yet tested against real keys/two devices.

## Deployment (GitHub Pages, currently manual)

The live preview is served from the **`gh-pages`** branch (Pages → "Deploy from
a branch" → `gh-pages` / root), at `https://fabrykjoh12.github.io/footballgame/`.

To redeploy: build with a **relative base** and push `dist/` to `gh-pages`:

```bash
npx tsc -b && npx vite build --base=./
# then publish dist/ (with a .nojekyll file) to the gh-pages branch
```

Gotchas:
- **Base path:** GitHub Project Pages serve under `/footballgame/`. We build
  with `--base=./` (relative) so assets resolve regardless of subpath. A normal
  `npm run build` uses base `/` and will white-screen on Pages.
- The repo-root `index.html` is the Vite **dev** template (references
  `/src/main.tsx`); never serve it raw. It includes a loading fallback that
  shows a message instead of a blank screen if the bundle fails to load.
- `import.meta.env`, `Date.now()` etc. are fine in-app but unavailable in plain
  Node — don't import app modules into ad-hoc Node scripts; they expect Vite.

## Gotchas

- Only the host's engine is authoritative in multiplayer; never run scoring on
  the guest. Guest `submitAnswer` publishes to the host.
- Scoring is intentionally client-trusted (host) — fine for casual play, **not**
  safe for ranked without server-side validation.
- React `StrictMode` is on (dev double-invokes effects); keep effects idempotent.
