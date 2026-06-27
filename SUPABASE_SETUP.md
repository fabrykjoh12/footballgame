# Enabling Supabase Realtime Multiplayer

Ball Knowledge is **fully playable with no backend** — "Create Room", "Join
Room" and "Local Demo" all work against a CPU opponent out of the box.

To play a real friend on another device, connect a free
[Supabase](https://supabase.com) project. This takes ~5 minutes.

---

## 1. Create a project & add env vars

1. Create a project at https://supabase.com.
2. In **Project Settings → API**, copy the **Project URL** and the **anon
   public** key.
3. Copy `.env.example` to `.env` (or `.env.local`) and fill in:

```bash
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-ANON-KEY
```

4. Restart the dev server. The home screen will now say
   *"Real-time multiplayer is enabled (Supabase)."*

That's it — **the live game loop needs no SQL.**

### Why no SQL is required for live play

The real-time sync uses **Supabase Realtime _Broadcast_** on a channel named
`bk-room-<CODE>`. The host's browser is authoritative: it runs the match
engine and broadcasts a full room snapshot on every change; the guest renders
snapshots and sends its actions (join / answer) back. Broadcast channels need
no database tables or row-level-security policies, so multiplayer works the
moment the two env vars are set.

The tables below are **optional** and only add server-side persistence /
match history. The app writes to them on a best-effort basis (failures are
silently ignored), so you can add them whenever you like.

---

## 2. (Optional) Persistence tables

Run this in the Supabase **SQL Editor** to store rooms, players and answers.
These mirror the app's domain model (`src/types/game.ts`).

```sql
-- Rooms: one row per match room
create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  room_code text unique not null,
  host_id text not null,
  status text not null default 'lobby',
  settings_json jsonb,
  selected_questions_json jsonb,
  current_question_index int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Players in a room
create table if not exists room_players (
  id uuid primary key default gen_random_uuid(),
  room_code text not null references rooms(room_code) on delete cascade,
  player_name text not null,
  is_host boolean not null default false,
  score int not null default 0,
  goals int not null default 0,
  correct_answers int not null default 0,
  streak int not null default 0,
  fastest_answer_ms int,
  created_at timestamptz not null default now()
);

-- Every submitted answer
create table if not exists room_answers (
  id uuid primary key default gen_random_uuid(),
  room_code text not null references rooms(room_code) on delete cascade,
  question_id text not null,
  player_id text not null,
  selected_answer text,
  is_correct boolean not null default false,
  time_taken_ms int,
  points_earned int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_room_players_code on room_players(room_code);
create index if not exists idx_room_answers_code on room_answers(room_code);
```

> The brief suggested a `room_id` foreign key; the shipped persistence code
> links children by `room_code` for simplicity. Swap to a `room_id uuid`
> FK if you prefer a normalised schema.

### Row Level Security

The MVP has **no authentication**, so allow the `anon` role to read/write.
For a public launch, tighten these (e.g. scope writes to a room you belong to).

```sql
alter table rooms enable row level security;
alter table room_players enable row level security;
alter table room_answers enable row level security;

create policy "anon all rooms"        on rooms        for all to anon using (true) with check (true);
create policy "anon all room_players" on room_players for all to anon using (true) with check (true);
create policy "anon all room_answers" on room_answers for all to anon using (true) with check (true);
```

### (Optional) Postgres change-data-capture

If you'd rather sync via database changes than broadcast, enable Realtime on
the tables and adapt `supabaseGameService.ts` to subscribe to
`postgres_changes`:

```sql
alter publication supabase_realtime add table rooms, room_players, room_answers;
```

---

## 3. (Optional) Sign-in & cross-device progress sync

This is **separate from multiplayer** and runs on **Firebase**, not Supabase, so
it works even if you're out of free Supabase projects. See **FIREBASE_SETUP.md**.

---

## 4. How the service layer is wired

| File | Role |
| --- | --- |
| `src/lib/supabaseClient.ts` | Reads env vars, exposes `isSupabaseConfigured` + a lazy client. |
| `src/services/gameService.ts` | Factory: returns `SupabaseGameService` when configured, else `LocalGameService`. |
| `src/services/supabaseGameService.ts` | Host-authoritative broadcast sync + best-effort persistence. |
| `src/services/localGameService.ts` | Offline play vs a bot (demo + no-backend fallback). |
| `src/services/matchEngine.ts` | Shared authoritative state machine + scoring. |

Both services implement the same `GameService` interface, so the UI is
completely unaware of which backend is active. Optional sign-in lives separately
(Firebase) — see FIREBASE_SETUP.md.
