# Ball Knowledge — Game Overview (for external review)

A portable, self-contained description of the game as it stands, written so an
AI with no access to the codebase can give opinions and recommend tweaks/features.

## Concept

**Ball Knowledge** is a real-time **1v1 football (soccer) knowledge duel**. Two
players join a room with a short code and play a **10-question match** assembled
from **ten different mini-games**. Trivia points convert into **goals** for a
football-style scoreline (e.g. "Sara FC 3–2 Jonas United"), with live commentary,
a 0–90' match timeline, goal animations, and **sudden-death stoppage time** if
the score is level at full time.

It's fully playable **offline vs a CPU bot**, and supports **real-time online
1v1** when keys are configured. Scope is **men's European football only**; visuals
are deliberately **license-free** — gradients, pitch patterns, icons, and
typography, never real club badges or player photos.

## Tech stack

- **React 18 + TypeScript (strict)**, **Vite**, **TailwindCSS**.
- **Vitest** unit tests (188 currently), run by CI before every deploy.
- Auto-deploy: push to `main` → GitHub Actions runs tests → builds → publishes a
  static site to GitHub Pages. The whole thing is a **client-side static app**;
  there is no custom game server.
- Optional integrations, each code-split out of the main bundle and gated on
  presence of keys:
  - **Ably** (preferred) or **Supabase Realtime** for online multiplayer.
  - **Firebase** (Auth + Firestore) for optional sign-in, cross-device progress
    sync, friends, leaderboards, and friend leagues.
  - With **no keys**, everything still works offline vs CPU; online/sign-in UI
    simply hides.

## Architecture (high level)

- The UI never talks to a backend directly. It talks to a single **`GameService`**
  interface. Three implementations are swapped by a factory: **Local** (offline
  vs bot), **Ably**, **Supabase**.
- All game paths share **one authoritative state machine** (`matchEngine`) that
  owns the room, runs every timer, applies scoring, and emits a fresh room
  snapshot on each transition.
- In multiplayer, **only the host runs the engine** and broadcasts snapshots;
  guests render snapshots and send their actions (join/answer) back. This keeps
  both players perfectly in sync but means **scoring is host-trusted** (fine for
  casual play, not safe for competitive ranked without server validation).
- **Game rules live in pure, unit-tested library modules**, never in UI
  components. Components read state and call actions.

## The ten mini-games

Each match plays **one of every type** (10 questions, interleaved). Answer
positions are randomized so the correct answer isn't always in the same slot.

1. **Who Am I?** — progressive clues revealed over time (vague → specific), pick
   the player from 4 options. Answering earlier (fewer clues) scores more.
2. **Career Path** — guess the player from their club timeline; 4 options.
3. **Higher or Lower** — two VS cards; pick which ranks higher on some metric
   (goals, caps, age, fees, etc.).
4. **Club / Country** — general football trivia, 4 options.
5. **Guess the Year** — pick the year an event happened; 4 year chips shown
   chronologically.
6. **Transfer Fee** — guess the headline fee of a famous move from 4 money chips.
7. **On the Pitch** — tap a player's primary position on a 4-line pitch grid
   (Goalkeeper / Defender / Midfielder / Forward).
8. **Odd One Out** — pick the option that doesn't belong.
9. **Spot the Lie** — four statements, pick the FALSE one.
10. **Guess the Number** — a numeric slider; **partial credit scales with
    closeness** (this is the only non-all-or-nothing type: ~10% off pays ~90% of
    the points, ≥100% off pays nothing).

## Scoring & match feel

- **Points → goals:** a fixed points-per-goal threshold (currently 2,500),
  capped at 5 goals. (Raising it was simulated; it spiked 0–0 draws, so it stayed.)
- **Per correct answer:** a base value + a **speed bonus** (more time left = more
  points) + a **streak bonus** (escalating for 2/3/4+ in a row).
- **Football-flavoured events** drive overlays + commentary: goal, equalizer,
  late winner, hat-trick, counterattack.
- **Sudden death:** if level on goals at full time, the host serves reserve
  tiebreaker questions; winning a round outright is a **golden goal**. If still
  unresolved, the higher points total wins — surfaced honestly everywhere as a
  win **"on points"**, never a fake decisive scoreline.

## Difficulty modes

Three modes gate which difficulty tiers questions are drawn from:
- **Casual** (Easy + Medium) — friendly.
- **Serious** (Medium + Hard).
- **Nightmare** (Hard + Nightmare) — tightest clock too.

## Content

- **1,111 questions** across all ten types and four difficulty tiers
  (easy/medium/hard/nightmare), authored in batches.
- Data integrity is **enforced by unit tests**: e.g. multiple-choice types must
  have exactly 4 distinct options with the correct answer among them;
  higher/lower's correct side must truly be the higher value; "guess the year"
  answers can't cluster in one chronological slot; numeric answers must sit
  inside the slider range; IDs must be unique.

## Question freshness (anti-repeat)

- A **per-device history** remembers recently-seen question IDs (currently the
  last ~600, i.e. roughly 60 of each type / ~60 matches).
- The picker serves **unseen questions first**; when a shallow pool is exhausted
  it reuses the **stalest** question (oldest-first), never one just played —
  effectively a round-robin through each type's pool.
- The Daily Challenge is exempt (it must stay identical for everyone).
- Limitation: history is **local to each device/browser** (not cloud-synced), so
  a new device starts fresh.

## Single-player & solo modes

- **Career Mode** — climb from League Two to the Premier League: 4 divisions
  (each a harder mode + tighter clock), a 6-team single round-robin season where
  you play 5 fixtures for real and rival results are deterministically simulated,
  a league table, promotion/relegation, and trophies. Persisted locally.
- **Solo arcade modes** (self-contained, no opponent):
  - **Survival** — questions get harder the longer you last; one miss ends it.
  - **Time Attack** — quickfire against the clock.
  - **The Gauntlet** — one of each type, difficulty climbing easy→nightmare.
- **Themed Cup Runs** — knockout tournaments vs escalating CPU opponents
  (Champions Run, World Cup Dream, Cup Sprint); win the final to lift a trophy.
- **Daily Challenge** — one deterministic puzzle per day (seeded from the date),
  with a tracked streak and best score.

## Social / online layer (optional, Firebase-gated)

All of this is built and code-split, but is gated on Firebase sign-in and is
**not yet fully device-tested with two real accounts**:
- **Optional sign-in** (email+password, Google, or passwordless email link) with
  **cross-device progress sync** (career, profile, daily blobs). Local-first:
  signing in reconciles rather than overwrites, so it never wipes local progress.
- **Friends list** with friend codes and **invite-to-room** (so players don't
  have to read out a room code) — works locally via share links even when signed
  out; live push invites when signed in.
- **Online leaderboards** (daily + all-time).
- **Private friend leagues** — season tables fed by each member's Daily Challenge
  score.
- **Achievements/badges**, **head-to-head records** vs each opponent (local).

## UX / accessibility / polish

- Mobile-first, "premium" visual pass across all screens (glassmorphism surfaces,
  a single neon-green accent used sparingly as the primary CTA, deterministic
  per-team kit colours).
- Correct/wrong states never rely on colour alone (icons + text); real buttons
  with aria labels; **`prefers-reduced-motion`** respected.
- **Synthesized sound** via Web Audio (no audio files): whistle, clicks,
  correct/wrong, goal, win.
- **Share** a match as a generated 1080² "matchday card" image, or as copy-paste
  text.
- Live commentary ticker (aria-live), 0–90' timeline with goal markers in kit
  colours, goal overlays.
- Multiplayer hardening: connection banner (reconnecting/failed), guest
  auto-resync on reconnect, lobby-slot release on leave, host-drop detection,
  guest-side countdown rebasing to neutralize clock skew.

## Known limitations / open items (good targets for recommendations)

- **Scoring is client/host-trusted** — fine for casual, unsafe for competitive
  ranked without server-side validation.
- The **online social layer** (friends/leaderboards/leagues/sign-in) is built but
  **not yet tested with two real signed-in accounts**; it also requires the owner
  to finish Firebase console setup (enable providers, authorized domains,
  Firestore security rules).
- The **Supabase** multiplayer path is built but not device-tested (Ably is the
  verified path).
- Freshness history and several stats are **per-device localStorage** only.
- Content is **men's football only**, no club badges/photos by design.
- There is **no true multiplayer tournament bracket** (more than 2 players in a
  lobby) — discussed but not built; it'd need new lobby infrastructure.
- It's a **static client-side app** — no custom backend beyond the optional
  managed services (Ably/Supabase/Firebase).

## Questions I'd like outside opinions on

1. What features would most increase **retention** and **day-2 return** for a
   casual football-trivia duel like this?
2. Is converting trivia points into a **football scoreline** the right core hook,
   or are there better framings?
3. Given it's a **static, client-trusted** app, what's the lightest-touch path to
   a **trustworthy competitive/ranked** mode?
4. Ideas for **new mini-game types** that fit the 10-question, 1v1, license-free,
   men's-football constraints?
5. How to make the **solo/single-player** loop (Career, Cups, Daily) more
   compelling without a backend?
6. Monetization or growth ideas that wouldn't compromise the clean, ad-free,
   license-free feel?
