# Enabling Real-time Multiplayer with Ably

Ball Knowledge is **fully playable with no backend** — "Create Room", "Join
Room" and "Local Demo" all work against a CPU opponent out of the box.

To play a real friend on another device, the easiest route is
[**Ably**](https://ably.com): a real-time messaging service with a generous
free tier, **no database to design and no server to deploy** — just an API key.

> Prefer Supabase, or already have a project? See
> [SUPABASE_SETUP.md](./SUPABASE_SETUP.md). If both are configured, Ably wins.

---

## 1. Get a free Ably key

1. Sign up at https://ably.com (free tier: millions of messages/month, plenty
   for casual play).
2. In your dashboard, open the default app → **API Keys**.
3. Copy the **root** key (looks like `aBcdEf.GhIjKl:MnOpQr...`). For a quick
   start the root key is fine; see **Security** below to lock it down.

## 2. Add it to your env

Copy `.env.example` → `.env` (or `.env.local`) and set:

```bash
VITE_ABLY_API_KEY=aBcdEf.GhIjKl:your-secret-here
```

Restart the dev server. The home screen will now read
*"Real-time multiplayer is enabled (Ably)."*

## 3. Play

- One player picks **Create Room** and shares the room code (or the "Copy
  link" URL).
- The other picks **Join Room** and enters the code.
- Both land in the lobby; the host chooses a mode and starts. Enjoy. ⚽

That's it — no SQL, no tables, no server.

---

## How it works

The live game uses **Ably channels**. The host's browser is authoritative: it
runs the match engine and **publishes a full room snapshot** on every change to
a channel named `bk-room-<CODE>`. The guest **subscribes** to those snapshots
and **publishes** its own actions (join / answer) back to the host, which feeds
them into its engine. Ably **presence** detects disconnects.

| File | Role |
| --- | --- |
| `src/lib/realtimeConfig.ts` | SDK-free env detection (keeps the SDK out of the main bundle). |
| `src/lib/ablyClient.ts` | Creates an Ably connection bound to the player's id. |
| `src/services/ablyGameService.ts` | Host-authoritative snapshot sync + presence. |
| `src/services/gameService.ts` | Factory: lazy-loads Ably (or Supabase) only when an online match starts. |
| `src/services/matchEngine.ts` | Shared authoritative state machine + scoring. |

The Ably SDK is **code-split into a lazily-loaded chunk**, so it is only
downloaded when a player actually creates/joins an online room — the demo
bundle stays lean.

---

## Security (before a public launch)

Embedding a **root** API key in the browser is fine for an MVP/demo (anyone
with the page can read it, same as a public key), but it grants all of that
key's capabilities. For production, do **one** of:

1. **Capability-limited key (quick):** In Ably → API Keys, create a key whose
   capability is restricted to `publish`, `subscribe` and `presence` on
   resource `bk-room-*`. Use that key in `VITE_ABLY_API_KEY`.

2. **Token auth (proper):** Stand up a tiny token endpoint that calls Ably's
   `createTokenRequest`, and switch `createAblyRealtime` in
   `src/lib/ablyClient.ts` from `{ key }` to `{ authUrl }`. This never exposes
   the secret to the browser. See
   https://ably.com/docs/auth/token.

Also consider rate-limiting and validating actions server-side if you ever
make matches ranked — today the host client is trusted to score honestly.
