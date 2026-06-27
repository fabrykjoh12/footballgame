# Enabling sign-in & cross-device progress sync (Firebase)

Career Mode, lifetime stats and the Daily Challenge streak are saved **locally**
(in `localStorage`) and work with **no account at all**. This is entirely
optional: connect a free [Firebase](https://firebase.google.com) project and a
**Sign in** button appears so players can back that progress up and carry it
across devices.

Sign-in is **passwordless** — the player enters their email, clicks the link we
send, and lands back signed in. It uses **Firebase Auth (email link)** +
**Cloud Firestore**, and is completely independent of the multiplayer backend
(Ably / Supabase). Takes ~10 minutes.

---

## 1. Create a Firebase project & web app

1. Go to https://console.firebase.google.com and **Add project** (Analytics is
   not needed — you can disable it).
2. Inside the project, **Add app → Web** (`</>`). Give it a nickname; you do
   **not** need Firebase Hosting.
3. Firebase shows a `firebaseConfig` object. Copy these values.

## 2. Add the env vars

Copy `.env.example` to `.env` (or `.env.local`) and fill in the web app config
(all values are public client config — safe to expose in a build):

```bash
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project
VITE_FIREBASE_APP_ID=1:1234567890:web:abc123
# Optional (not required for auth + Firestore):
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
```

For the deployed site, add the same vars as **repository secrets** and wire them
into the build in `.github/workflows/deploy.yml` (next to `VITE_ABLY_API_KEY`).

Restart the dev server — a **Sign in** button now appears in the header.

## 3. Enable the sign-in methods

The app offers three ways to sign in: **email + password**, **Google**, and a
passwordless **email link**. You only need to enable the ones you want — but if
a player picks a method you haven't enabled, Firebase returns
`auth/operation-not-allowed`. **Email/Password is the simplest and most reliable
to start with.**

1. In the console: **Build → Authentication → Get started**.
2. **Sign-in method** tab → enable what you want:
   - **Email/Password → Enable.** This one toggle covers both password sign-in
     *and* the magic link (also tick **Email link (passwordless sign-in)** if you
     want the link option). Save.
   - **Google → Enable** → pick a support email → Save. (Needed only for the
     "Continue with Google" button.)
3. **Authentication → Settings → Authorized domains**: add the domains the app
   runs on, e.g.:
   - `localhost` (already there for dev)
   - `YOUR-USER.github.io` (GitHub Pages)

   Both the email link and Google sign-in return the player to the app URL, so
   its domain must be authorized.

## 4. Create Firestore + lock it down

1. **Build → Firestore Database → Create database** (Production mode is fine).
2. **Rules** tab — replace with the following so each player can only read/write
   their own progress document:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function signedIn() { return request.auth != null; }

    // Private progress sync — only the owner.
    match /progress/{uid} {
      allow read, write: if signedIn() && request.auth.uid == uid;
    }

    // Public profile (name + friend code). Any signed-in user can read it so
    // friends resolve; only the owner can write their own.
    match /users/{uid} {
      allow read: if signedIn();
      allow write: if signedIn() && request.auth.uid == uid;

      // Your friends list + your invite inbox live under your own doc.
      match /friends/{friendUid} {
        allow read, write: if signedIn() && request.auth.uid == uid;
      }
      match /invites/{inviteId} {
        // The owner reads/deletes; anyone signed-in may send you an invite.
        allow read, delete: if signedIn() && request.auth.uid == uid;
        allow create: if signedIn();
      }
    }

    // Friend-code → uid lookup. Readable by signed-in users; you may only
    // claim a code that points at your own uid.
    match /friendCodes/{code} {
      allow read: if signedIn();
      allow write: if signedIn() && request.resource.data.uid == request.auth.uid;
    }

    // Leaderboards — readable by signed-in users; you may only write your row.
    // NOTE: scoring is client-trusted (the host runs the engine), so treat
    // these as casual bragging rights, not cheat-proof rankings.
    match /leaderboards/{board}/entries/{uid} {
      allow read: if signedIn();
      allow write: if signedIn() && request.auth.uid == uid;
    }

    // Private friend leagues. A league doc is readable by its members; the
    // owner creates it; a signed-in user may update it only if they end up a
    // member (this is how joining by code works). Each member may write only
    // their own result rows.
    match /leagues/{leagueId} {
      allow read: if signedIn() && request.auth.uid in resource.data.memberUids;
      allow create: if signedIn() && request.auth.uid == request.resource.data.ownerUid;
      allow update: if signedIn() && request.auth.uid in request.resource.data.memberUids;

      match /results/{resultId} {
        allow read: if signedIn();
        allow write: if signedIn() && request.auth.uid == request.resource.data.uid;
      }
    }
    // League join-code → id lookup.
    match /leagueCodes/{code} {
      allow read: if signedIn();
      allow write: if signedIn();
    }
  }
}
```

This covers everything: `progress/{uid}` (private sync), `users/{uid}` (public
profile + your `friends`/`invites` sub-collections), `friendCodes/{code}` (the
add-by-code lookup), `leaderboards/{board}/entries/{uid}` (daily + all-time
boards), and `leagues/{id}` + `leagueCodes/{code}` (private friend leagues — the
Daily-fed season tables). All these features stay hidden until sign-in is
enabled, and the app still works fully anonymously without any of this.

---

## How sync behaves

- **Local-first.** Everything works signed-out; sign-in only mirrors what's
  already on the device.
- **On sign-in**, the app pulls your Firestore doc and reconciles it with local
  progress (`reconcileProgress` in `src/lib/progress.ts`): your account is the
  source of truth per blob, but local fills any gap the cloud doesn't have — so
  a first sign-in never wipes existing local progress.
- **On every save** (a finished match, an advanced season, a daily result) the
  snapshot is debounced and pushed back up.
- **Sign-out** keeps your progress on the device.

The Firebase SDK is loaded lazily (its own code-split chunk), so anonymous /
unconfigured builds never download it, and the sign-in UI is hidden unless the
config above is present.

---

## How it's wired

| File | Role |
| --- | --- |
| `src/lib/firebaseConfig.ts` | Reads env vars, exposes `isFirebaseConfigured` (SDK-free). |
| `src/services/firebaseBackend.ts` | Lazy Firebase SDK: email-link auth + Firestore pull/push. |
| `src/context/AuthProvider.tsx` | `useAuth()` — session state, hydration splash, debounced push. |
| `src/lib/progress.ts` | Local progress snapshot + pure reconcile rules (unit-tested). |
| `src/components/auth/AccountButton.tsx` | Header button + sign-in / account modal. |
