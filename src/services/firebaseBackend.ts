/**
 * Firebase backend for OPTIONAL sign-in + cross-device progress sync.
 *
 * Auth uses passwordless **email links**; progress lives in one Firestore doc
 * per user (`progress/{uid}`) holding the three durable blobs as JSON.
 *
 * This module statically imports the Firebase SDK, so it is ONLY ever reached
 * via a dynamic import from `AuthProvider` — keeping the SDK code-split out of
 * the main/anonymous bundle. The SDK-free `isFirebaseConfigured` flag lives in
 * `firebaseConfig.ts`.
 */

import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  isSignInWithEmailLink,
  onAuthStateChanged,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  signOut,
  type Auth,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  getFirestore,
  setDoc,
  type Firestore,
} from 'firebase/firestore';
import { firebaseConfig } from '../lib/firebaseConfig';
import type { ProgressSnapshot } from '../lib/progress';

const EMAIL_STORAGE_KEY = 'bk_emailForSignIn';
const COLLECTION = 'progress';

export interface BackendUser {
  id: string;
  email: string | null;
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

function ensure(): { auth: Auth; db: Firestore } | null {
  if (!firebaseConfig) return null;
  if (!app) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  }
  return auth && db ? { auth, db } : null;
}

/** Subscribe to auth state. Returns an unsubscribe fn (noop if unconfigured). */
export function subscribe(cb: (user: BackendUser | null) => void): () => void {
  const ctx = ensure();
  if (!ctx) {
    cb(null);
    return () => {};
  }
  return onAuthStateChanged(ctx.auth, (u) =>
    cb(u ? { id: u.uid, email: u.email } : null),
  );
}

/** Send a passwordless sign-in link to the given email. */
export async function sendLink(email: string, redirectUrl: string): Promise<void> {
  const ctx = ensure();
  if (!ctx) throw new Error('Sign-in is not available.');
  await sendSignInLinkToEmail(ctx.auth, email, {
    url: redirectUrl,
    handleCodeInApp: true,
  });
  try {
    localStorage.setItem(EMAIL_STORAGE_KEY, email);
  } catch {
    /* storage unavailable */
  }
}

/**
 * If the current URL is a returning email-link, complete the sign-in and strip
 * the link params from the address bar. Safe to call on every load.
 */
export async function completeEmailLinkSignIn(): Promise<void> {
  const ctx = ensure();
  if (!ctx || typeof window === 'undefined') return;
  const href = window.location.href;
  if (!isSignInWithEmailLink(ctx.auth, href)) return;

  let email: string | null = null;
  try {
    email = localStorage.getItem(EMAIL_STORAGE_KEY);
  } catch {
    /* ignore */
  }
  // Fallback: same-device flow stores the email; if missing, prompt for it.
  if (!email) email = window.prompt('Confirm your email to finish signing in') ?? null;
  if (!email) return;

  try {
    await signInWithEmailLink(ctx.auth, email, href);
    localStorage.removeItem(EMAIL_STORAGE_KEY);
  } catch {
    /* invalid / expired link — ignore, user can retry */
  } finally {
    // Remove the link query/hash so a refresh doesn't re-trigger it.
    window.history.replaceState(
      {},
      document.title,
      window.location.origin + window.location.pathname,
    );
  }
}

export async function signOutUser(): Promise<void> {
  const ctx = ensure();
  if (ctx) await signOut(ctx.auth);
}

/** Read the user's saved progress, or null if they have no doc yet. */
export async function pullProgress(uid: string): Promise<ProgressSnapshot | null> {
  const ctx = ensure();
  if (!ctx) return null;
  const snap = await getDoc(doc(ctx.db, COLLECTION, uid));
  if (!snap.exists()) return null;
  const data = snap.data() as Partial<ProgressSnapshot>;
  return {
    career: data.career ?? null,
    profile: data.profile ?? null,
    daily: data.daily ?? null,
  };
}

/** Upsert the user's progress doc. */
export async function pushProgress(
  uid: string,
  snapshot: ProgressSnapshot,
): Promise<void> {
  const ctx = ensure();
  if (!ctx) return;
  // JSON round-trip strips any `undefined` (Firestore rejects it).
  const clean = JSON.parse(JSON.stringify(snapshot)) as ProgressSnapshot;
  await setDoc(
    doc(ctx.db, COLLECTION, uid),
    { ...clean, updatedAt: Date.now() },
    { merge: true },
  );
}
