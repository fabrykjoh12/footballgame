# ⚽ Ball Knowledge

**Prove your football IQ against your friends.**

A polished, real-time 1v1 football (soccer) knowledge duel. Two players join a
room with a short code and battle through a 10-question match built from ten
football mini-games. Points convert into **goals**, so you don't just win a
quiz — you win a match: _"Sara FC 3–2 Jonas United."_

Think **Kahoot × Football Wordle × FIFA trivia × a live match scoreboard.**

> Football here means **European football / soccer.** No copyrighted club
> badges or player photos are used — the look is built from gradients, pitch
> patterns, icons and typography. **Men's football only.**

---

## 🎯 Product focus

**The core product is the 1v1 football IQ duel where every answer can score a
goal — and every result is worth sharing.** Everything else exists to serve
that loop:

- **Core (P0):** the 1v1 duel (vs a friend or the CPU), the daily fixture, and
  a shareable result. Keep these sharp.
- **Retention (P1):** streaks, quests, club identity, career/cup, leaderboards —
  they bring players back to the core loop; they are not the product.
- **Everything else is secondary.** Do **not** add more game modes until the
  core duel + sharing + retention are polished. The winning version is *"the
  football IQ duel app,"* not *"a football app with many quiz modes."*

See the **[Pre-launch checklist](#-pre-launch-checklist)** before shipping
publicly.

---

## ✨ Features

- **Real-time 1v1 duels** via Ably or Supabase — or a fully offline **demo
  mode vs a CPU** when no backend is configured.
- **Ten mini-games:** Who Am I? (timed clue reveals), Career Path, Higher or
  Lower, Club/Country, Guess the Year, Transfer Fee, Pitch Position, Odd One
  Out, Spot the Lie, and Guess the Number (closeness-scored slider).
- **Football-style scoring:** raw points convert into goals; live events like
  `GOAL!`, `Equalizer!`, `Late Winner!`, `Hat-trick!` and `Counterattack!`, plus
  **sudden-death stoppage time** when level on goals.
- **Three difficulty modes:** Casual, Serious Ball Knowledge, Nightmare — each
  with its own difficulty tiers and clock.
- **Daily fixture:** one deterministic, seeded match a day vs a named rival,
  with a streak.
- **Shareable results:** a football-style headline, a canvas matchday card, and
  copy/Web-Share text with a "can you beat this?" challenge line.
- **Secondary modes** (retention, not core): Career, Cup Runs, solo arcade,
  Connections, Mystery Duel, The Scout, and more.
- **Premium stadium UI:** dark pitch background, neon-green markings,
  glassmorphism cards, stoppage-time timer, animated scoreboard, confetti.
- **1,177-question database** spanning eras and difficulties, guarded by
  shape-integrity tests (`npm run validate:data`).
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
npm run build         # type-check + production build
npm run preview       # serve the production build
npm run lint          # type-check only (tsc --noEmit)
npm test              # run the Vitest suite (gates every deploy)
npm run validate:data # shape-check the question database only
npm run check:bundle  # fail if the home entry chunk exceeds 300 kB
```

Open the app, enter a name, and pick **Create Room**, **Join Room**, or
**Play Local Demo**.

---

## 🎮 How demo mode works (no backend needed)

If Supabase env vars are absent, everything still works against a **simulated
opponent** so the whole game loop is testable on one device:

- **Challenge a friend** → you're the host; a CPU opponent joins the lobby, you
  choose a mode and kick off.
- **Enter room** → you're the guest; a CPU _hosts_ and starts the match itself
  (this exercises the non-host "waiting for host" flow).
- **Warm up vs CPU** → straight into a match vs the CPU.

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

The remaining six types (Guess the Year, Transfer Fee, Pitch Position, Odd One
Out, Spot the Lie, Guess the Number) follow the same base + speed + streak
model. **Guess the Number** is the one non-all-or-nothing type: it's a slider,
and points scale linearly with how close you are to the true value.

**Streak bonus:** 2-in-a-row +50, 3 +100, 4+ +150.
**Goals:** every 2500 points = 1 goal (capped at 5). The match shows both the
football score (`3–2`) and raw points (`8420–7310`). If the match is level on
goals at full time, host-run **sudden-death stoppage time** decides it with a
golden goal; a still-level match is decided **on points**, surfaced honestly.

All of this lives in pure, testable functions in
[`src/lib/scoring.ts`](./src/lib/scoring.ts).

---

## 🗂️ Project structure

```
src/
  App.tsx                     # status-driven screen router
  main.tsx
  types/game.ts               # all domain types (single source of truth)
  data/questions.ts           # 1,177 questions across 10 mini-game types
  lib/
    scoring.ts                # points → goals, bonuses, football events
    roomCode.ts               # BK7Q2-style codes
    questionPicker.ts         # distribution-driven pick + difficulty filter + shuffle
    answerValidation.ts       # host-side answer/timing sanitisation (anti-cheat basics)
    analytics.ts              # provider-agnostic trackEvent()
    matchModes.ts             # Casual / Serious / Nightmare configs + MATCH_TYPE_DISTRIBUTION
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

## ✅ Pre-launch checklist

Honest state of what must happen before a public launch. This is a strong,
playable base — but a few things are **built but not production-hardened**:

- [ ] **Verify the question database.** `npm run validate:data` checks *shape*
      (unique ids, valid options/enums, non-empty text) — **not factual
      accuracy.** Approximate figures (fees, tallies, caps) must be
      source-verified; hardcore fans lose trust instantly on a wrong fact.
- [x] **First-time UX.** New players (no match history) get a focused layout —
      hero, name/club, three primary CTAs, today's fixture, and a "how it
      works" strip — before the full dashboard unlocks.
- [x] **Shareable result card.** Football headline + matchday image + Web-Share
      / clipboard text with a challenge line.
- [ ] **Wire the analytics sink.** `lib/analytics.ts` `trackEvent()` is a no-op
      by default; register a real provider (PostHog/Plausible) via
      `setAnalyticsSink` and confirm the funnel (visit → match → share).
- [ ] **Ranked anti-cheat.** Scoring is **host/client-trusted**. `answerValidation.ts`
      clamps timing + validates selections host-side (good enough for casual),
      but a real ranked ladder needs **server-side** re-derivation of the score
      from the answer log. Don't ship competitive leaderboards without it.
- [ ] **Reconnect / clock-sync.** Ably 1v1 is verified across two devices;
      Supabase + Firebase sign-in paths are **built but not device-tested**.
- [ ] **Backend profile sync.** Progress is local-first; Firebase sync + the
      friends/leaderboard/league layer need the owner-side console steps in
      `FIREBASE_SETUP.md` and a two-account device test.

## 🔭 Roadmap (priority order)

- **P0 (before launch):** verify data facts; wire analytics; device-test the
  online layer.
- **P1 (retention & sharing):** deepen the daily/streak loop; more share-card
  variety; surface achievements/leaderboard placement on home.
- **P2 (ranked & scale):** server-authoritative scoring; ELO; reconnect/spectator.
- **P3 (polish):** refactor `QuestionCard` into a per-type renderer registry;
  a broadcast visual pass on the match screen; more sound design.
