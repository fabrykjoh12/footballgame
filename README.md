# ⚽ Ball Knowledge

**Prove your football IQ against your friends.**

A polished, real-time 1v1 football (soccer) knowledge duel. Two players join a
room with a short code and battle through a 10-question match built from four
football mini-games. Points convert into **goals**, so you don't just win a
quiz — you win a match: _"Sara FC 3–2 Jonas United."_

Think **Kahoot × Football Wordle × FIFA trivia × a live match scoreboard.**

> Football here means **European football / soccer.** No copyrighted club
> badges or player photos are used — the look is built from gradients, pitch
> patterns, icons and typography.

---

## ✨ Features

- **Real-time 1v1 duels** via Ably or Supabase — or a fully offline **demo
  mode vs a CPU** when no backend is configured.
- **Four mini-games:** Who Am I? (timed clue reveals), Career Path, Higher or
  Lower, and Club/Country trivia.
- **Football-style scoring:** raw points convert into goals; live events like
  `GOAL!`, `Equalizer!`, `Late Winner!`, `Hat-trick!` and `Counterattack!`.
- **Three difficulty modes:** Casual, Serious Ball Knowledge, Nightmare.
- **Premium stadium UI:** dark pitch background, neon-green markings,
  glassmorphism cards, stoppage-time timer, animated scoreboard, confetti.
- **64-question seed database** spanning eras and difficulties.
- **Responsive & accessible:** mobile-first, keyboard friendly, never relies on
  colour alone for correct/wrong.

---

## 🚀 Run it locally

Requirements: Node 18+ (built on Node 22).

```bash
npm install
npm run dev      # start the dev server (http://localhost:5173)
```

Other scripts:

```bash
npm run build    # type-check + production build
npm run preview  # serve the production build
npm run lint     # type-check only (tsc --noEmit)
```

Open the app, enter a name, and pick **Create Room**, **Join Room**, or
**Play Local Demo**.

---

## 🎮 How demo mode works (no backend needed)

If Supabase env vars are absent, everything still works against a **simulated
opponent** so the whole game loop is testable on one device:

- **Create Room** → you're the host; a CPU opponent joins the lobby, you choose
  a mode and kick off.
- **Join Room** → you're the guest; a CPU _hosts_ and starts the match itself
  (this exercises the non-host "waiting for host" flow).
- **Play Local Demo** → straight into a match vs the CPU.

The bot's accuracy scales with difficulty (Casual is winnable; Nightmare is
brutal), and it "thinks" for a realistic, varied amount of time.

---

## 🌐 Enable real multiplayer

Configure **one** provider (if both are set, Ably wins). The realtime SDK is
code-split, so it's only downloaded when a player actually starts an online
match — the demo bundle stays lean.

**Option A — Ably (recommended: no database, no server):**
1. Get a free key at [ably.com](https://ably.com).
2. Copy `.env.example` → `.env`, set `VITE_ABLY_API_KEY`, restart.
3. Full guide + security notes: **[ABLY_SETUP.md](./ABLY_SETUP.md)**.

**Option B — Supabase (reuses any existing project, no SQL needed):**
1. Copy `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` into `.env`, restart.
2. Live sync uses Realtime _broadcast_ (no tables required). Optional
   persistence schema + RLS: **[SUPABASE_SETUP.md](./SUPABASE_SETUP.md)**.

Both backends are host-authoritative (the host runs the match engine and
broadcasts snapshots) and implement the same `GameService` interface, so the
UI is identical either way.

---

## 🧠 Scoring rules

Base points per mini-game, plus a speed bonus (more time left = more points)
and a streak bonus. Wrong answers score 0 (no negatives).

| Mini-game | Base | Speed bonus | Notes |
| --- | --- | --- | --- |
| Who Am I? | 1000 / 700 / 400 | up to 200 | base drops as clues reveal (0s / 5s / 10s) |
| Career Path | 800 | up to 200 | hidden `???` clubs on harder variants |
| Higher or Lower | 700 | up to 300 | reveals both values after answering |
| Club / Country | 700 | up to 300 | 4-option trivia |

**Streak bonus:** 2-in-a-row +50, 3 +100, 4+ +150.
**Goals:** every 2500 points = 1 goal (capped at 5). The match shows both the
football score (`3–2`) and raw points (`8420–7310`).

All of this lives in pure, testable functions in
[`src/lib/scoring.ts`](./src/lib/scoring.ts).

---

## 🗂️ Project structure

```
src/
  App.tsx                     # status-driven screen router
  main.tsx
  types/game.ts               # all domain types (single source of truth)
  data/questions.ts           # 64 seed questions
  lib/
    scoring.ts                # points → goals, bonuses, football events
    roomCode.ts               # BK7Q2-style codes
    questionPicker.ts         # 3/3/2/2 distribution + difficulty filter + shuffle
    matchModes.ts             # Casual / Serious / Nightmare configs
    realtimeConfig.ts         # SDK-free env detection (keeps SDKs out of main bundle)
    ablyClient.ts             # Ably connection (lazy chunk)
    supabaseClient.ts         # Supabase client (lazy chunk)
    teamName.ts · playerTitle.ts · shareResult.ts · id.ts
  services/
    gameService.ts            # factory: local vs lazily-loaded ably/supabase
    matchEngine.ts            # authoritative state machine (shared)
    localGameService.ts       # offline / bot opponent
    ablyGameService.ts        # real-time multiplayer (Ably)
    supabaseGameService.ts    # real-time multiplayer (Supabase broadcast)
    botPlayer.ts              # CPU answer behaviour
  context/GameProvider.tsx    # React state + actions over the service
  hooks/                      # useCountdown, useLocalStorage
  components/
    layout/   AppShell · StadiumBackground · Scoreboard
    home/     HomePage
    lobby/    LobbyPage
    game/     GamePage · QuestionCard · AnswerOption · TimerBar
              ResultReveal · GoalAnimation · FinalResult
    ui/       Button · Card · Badge · AnimatedNumber · icons
  styles/globals.css
```

### Most important files to read first

1. **`src/types/game.ts`** — the domain model everything is built on.
2. **`src/services/matchEngine.ts`** — the authoritative game loop & rules.
3. **`src/lib/scoring.ts`** — all scoring/goal/event math.
4. **`src/context/GameProvider.tsx`** — how the UI talks to a backend.

---

## 🏗️ Architecture notes

- The UI only ever talks to the `GameService` **interface**. `LocalGameService`
  and `SupabaseGameService` are interchangeable, so screens never know which
  backend is live.
- A single **`MatchEngine`** holds the authoritative `Room` and drives all
  timers, scoring and transitions. Local mode runs it on your machine; in
  Supabase mode only the **host** runs it and broadcasts snapshots.
- Adding a new mini-game = add a variant to the `Question` union, a branch in
  `scoring`/`questionPicker`, and a case in `QuestionCard`/`ResultReveal`.

### Data accuracy

The seed data reflects well-established football facts. `higher_lower` figures
are **approximate and for display only** — every pair was chosen so the
_direction_ of the comparison is unambiguous and historically settled.
Re-verify the dataset before a public launch.

---

## ♿ Accessibility

Real `<button>` elements throughout, visible focus rings, `aria-label`s on
icon-only controls, a `progressbar` role on the timer, `role="alert"` for
errors, and correct/wrong states shown with **icons + text**, never colour
alone.

---

## 🔭 What to build next

- Server-authoritative validation (move scoring server-side to prevent
  client tampering in ranked play).
- Reconnect / spectator support and clock-sync for the shared timer.
- More question types (formation builder, "guess the year", commentary clips).
- Daily Challenge and category selection (placeholders exist in the design).
- Real sound design behind the existing sound toggle.
- Persistent profiles, leaderboards and ELO.
