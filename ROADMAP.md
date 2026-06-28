# Ball Knowledge — Roadmap of Ideas

A living list of where the game can go next. Nothing here is committed until
confirmed with the owner. Ordered loosely by bang-for-buck within each section.
See `CLAUDE.md` for the current built state and `GAME_OVERVIEW.md` for a full
description.

## Recently shipped (context)

- Loading-hang fixes (Firestore long-polling + splash safety cap) — **live**.
- Code-splitting: home chunk **924 kB → 268 kB** (modes + question bank + player
  DB load on demand) — **live**.
- Room-code hardening (5 crypto-random chars) — **live**.
- **Central player database** — 164-club canonical registry, query layer, ~249
  players, `birthYear`, integrity tests; Mystery Player Duel unified onto it.
- **Connections** — now database-backed (accepts anyone in the DB who played for
  both clubs) and **out of beta**.

---

## 🎯 Flagship — Mystery Player Duel: Online + Manual Answering

The two ideas ("players answer questions themselves" + "play with friends
online") are really one feature, because manual answering only makes sense with
a second human: to auto-answer online, your device would need the opponent's
secret-player metadata, which leaks their pick. The natural online mechanic is
**you ask, they tap Yes / No / Unsure** about their own secret player — authentic
Guess Who.

**Scope**
- An `AblyMysteryService` (Mystery has its *own* engine, not the 1v1 match
  engine) that broadcasts `MysteryState` from a host and relays guest actions
  (pick, ask, answer, guess). Mirrors how the main game does host-authoritative
  realtime.
- **Manual answer mode** generalised from the existing "free question" path
  (already manually answered + logged + never auto-filtered).
- **Commit-reveal fairness** — already half-built (`commitPick` / `verifyCommit`
  hash each secret at lock time). Online: both commit up front, reveal at the
  end, so nobody can swap players mid-game.
- **Friend invites** reuse the existing friends / invite-to-room plumbing (friend
  codes, invite links) — "invite a friend to a Mystery duel" in one tap.

**Design decisions (open)**
1. Answer mode as a **setting** (`auto` = metadata-validated, great vs CPU;
   `manual` = opponent answers, the online/social default) — recommended — vs
   making manual fully replace auto.
2. Manual-mode honesty: trust players, with an optional end-of-game reveal that
   surfaces any answers that didn't match their player — vs live "that doesn't
   match" validation.

**Effort:** medium-large (new realtime layer + flow changes). Highest "play with
friends" payoff.

---

## 🆕 New modes powered by the player database

The central DB now makes these cheap to build:

- **Daily Connections** — one seeded puzzle/day with a streak (like the Daily
  Challenge). Queued from the Connections work.
- **Older or Younger?** — higher/lower on `birthYear`.
- **Auto-generated Career Path** — built from each player's club chain.
- **Starting XI / Same Club** — name N players from a club or famous lineup.
- **Connections as an 11th 1v1 type** — fold typed Connections into the main
  match mix (needs a `QuestionCard` text branch + host-side accept grading).
- **Manager Merry-go-round** — Connections-style but for managers (needs a
  manager dataset, same registry pattern).

## 🌐 Light up the online layer (built but never device-tested)

Firebase is now configured, so this is unblocked:

- Two-account test of **friends + leaderboards + friend leagues**.
- Shares the friends/invite plumbing with the Mystery online work above.

## 📈 Content & depth

- Grow the player DB to **300–400** players + backfill `birthYear` on the
  original ~190.
- Keep growing the question bank; watch thin per-type / per-difficulty pools
  (smallest Casual pools: guess_the_number ~25, spot_the_lie ~27).

## 🔧 Robustness / quality (from the Codex review)

- **Multiplayer anti-spoof** — verify the sender owns the `playerId` they submit
  (cheap; worth doing even for casual play).
- **ESLint + Prettier + PR CI** checks (today `lint` is just `tsc`; CI runs on
  push to `main` only).
- **Supabase resilience parity** with Ably (reconnect, clock rebasing) — only if
  Supabase becomes a real backend.
- **Ranked + server-side score validation** — scoring is host/client-trusted
  today; a real ranked mode needs a thin server (Cloud Function / Supabase RPC)
  re-deriving scores from the answer log. Big lift; only if competitive play
  becomes a goal.

---

## Sequencing options

- **Big-bang:** go straight for the Mystery online overhaul — the marquee
  "play with friends" feature.
- **Momentum-first:** ship a couple of quick DB-powered modes (Daily Connections,
  Older or Younger) for fast visible wins, then take on the Mystery overhaul.

Both are valid; pick based on whether you want one large exciting feature or
several small ones first.
