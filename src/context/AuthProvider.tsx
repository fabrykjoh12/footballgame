import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { isFirebaseConfigured } from '../lib/firebaseConfig';
import {
  PROGRESS_EVENT,
  readLocalProgress,
  reconcileProgress,
  writeLocalProgress,
} from '../lib/progress';

export interface AuthUser {
  id: string;
  email: string | null;
  username: string | null;
}

interface AuthContextValue {
  /** Whether sign-in is available in this build (Firebase config present). */
  configured: boolean;
  user: AuthUser | null;
  /** True while restoring a signed-in session's progress on load. */
  hydrating: boolean;
  /** True when the user is signed in but hasn't chosen a username yet. */
  needsUsername: boolean;
  /** Send a passwordless sign-in (email) link. */
  signInWithEmail: (email: string) => Promise<AuthResult>;
  /** Email + password sign-in for an existing account. */
  signInWithPassword: (email: string, password: string) => Promise<AuthResult>;
  /** Create a new email + password account. */
  registerWithPassword: (email: string, password: string) => Promise<AuthResult>;
  /** One-tap Google sign-in. */
  signInWithGoogle: () => Promise<AuthResult>;
  /** Claim a unique username for this account. */
  setUsername: (username: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
}

export interface AuthResult {
  ok: boolean;
  error?: string;
}

/** Map raw Firebase auth errors to short, friendly copy. */
function authErrorMessage(e: unknown): string {
  const code =
    e && typeof e === 'object' && 'code' in e ? String((e as { code: unknown }).code) : '';
  switch (code) {
    case 'auth/operation-not-allowed':
      return 'This sign-in method isn’t enabled yet — turn it on in Firebase → Authentication → Sign-in method.';
    case 'auth/invalid-email':
      return 'That doesn’t look like a valid email.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Wrong email or password.';
    case 'auth/email-already-in-use':
      return 'That email already has an account — sign in instead.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Sign-in was cancelled.';
    case 'auth/popup-blocked':
      return 'Your browser blocked the popup — allow popups and try again.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a moment and try again.';
    default:
      return e instanceof Error ? e.message : 'Something went wrong.';
  }
}

const AuthContext = createContext<AuthContextValue | null>(null);

const PUSH_DEBOUNCE_MS = 1500;
/**
 * Hard cap on the "Restoring your progress…" splash. Reconcile is best-effort
 * (local play is unaffected if it's slow/offline), so the sync must never block
 * the app for longer than this — e.g. when a Firestore read long-polls instead
 * of failing fast. The merge still completes in the background if it arrives.
 */
const HYDRATE_TIMEOUT_MS = 3000;

type Backend = typeof import('../services/firebaseBackend');

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isFirebaseConfigured;
  const [user, setUser] = useState<AuthUser | null>(null);
  const [hydrating, setHydrating] = useState<boolean>(configured);

  const backendRef = useRef<Backend | null>(null);
  const userRef = useRef<AuthUser | null>(null);
  const hydratedForRef = useRef<string | null>(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  /** Pull remote progress + username, merge with local, and reconcile (once per user). */
  const applySession = useCallback(async (u: { id: string; email: string | null }) => {
    setUser({ ...u, username: null });
    if (hydratedForRef.current === u.id) return;
    hydratedForRef.current = u.id;
    setHydrating(true);
    // Never let a slow/hanging remote read keep the splash up — free the UI
    // after a few seconds and let the merge finish in the background.
    const safety = setTimeout(() => setHydrating(false), HYDRATE_TIMEOUT_MS);
    try {
      const backend = backendRef.current;
      if (backend) {
        const [remote, profile] = await Promise.all([
          backend.pullProgress(u.id),
          backend.getUserProfile(u.id),
        ]);
        const { result, shouldPush } = reconcileProgress(readLocalProgress(), remote);
        writeLocalProgress(result);
        if (shouldPush) await backend.pushProgress(u.id, result);
        setUser({ ...u, username: profile?.username ?? null });
      }
    } catch {
      /* offline / transient — local play is unaffected */
    } finally {
      clearTimeout(safety);
      setHydrating(false);
    }
  }, []);

  // Boot the auth backend, complete any returning email-link, and watch session.
  useEffect(() => {
    if (!configured) {
      setHydrating(false);
      return;
    }
    let active = true;
    let unsubscribe = () => {};

    (async () => {
      let backend: Backend | null = null;
      try {
        backend = await import('../services/firebaseBackend');
      } catch {
        backend = null;
      }
      if (!active) return;
      if (!backend) {
        setHydrating(false);
        return;
      }
      backendRef.current = backend;

      // Finish a sign-in if the user just clicked their email link.
      try {
        await backend.completeEmailLinkSignIn();
      } catch {
        /* ignore */
      }
      if (!active) return;

      let sawInitial = false;
      unsubscribe = backend.subscribe((u) => {
        if (u) {
          void applySession(u);
        } else {
          hydratedForRef.current = null;
          setUser(null);
          setHydrating(false);
        }
        sawInitial = true;
      });

      // If the listener hasn't reported yet, don't hang the splash forever.
      setTimeout(() => {
        if (active && !sawInitial) setHydrating(false);
      }, 4000);
    })();

    return () => {
      active = false;
      unsubscribe();
    };
  }, [configured, applySession]);

  // Debounced cloud push whenever local progress changes while signed in.
  useEffect(() => {
    if (!configured || typeof window === 'undefined') return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onChange = () => {
      const u = userRef.current;
      const backend = backendRef.current;
      if (!u || !backend) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        backend.pushProgress(u.id, readLocalProgress()).catch(() => {});
      }, PUSH_DEBOUNCE_MS);
    };
    window.addEventListener(PROGRESS_EVENT, onChange);
    return () => {
      window.removeEventListener(PROGRESS_EVENT, onChange);
      clearTimeout(timer);
    };
  }, [configured]);

  const signInWithEmail = useCallback(async (email: string): Promise<AuthResult> => {
    const backend = backendRef.current;
    if (!backend) return { ok: false, error: 'Sign-in is not available right now.' };
    const redirect =
      typeof window !== 'undefined'
        ? window.location.origin + window.location.pathname
        : '';
    try {
      await backend.sendLink(email.trim(), redirect);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: authErrorMessage(e) };
    }
  }, []);

  const signInWithPassword = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      const backend = backendRef.current;
      if (!backend) return { ok: false, error: 'Sign-in is not available right now.' };
      try {
        await backend.signInWithPassword(email.trim(), password);
        return { ok: true };
      } catch (e) {
        return { ok: false, error: authErrorMessage(e) };
      }
    },
    [],
  );

  const registerWithPassword = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      const backend = backendRef.current;
      if (!backend) return { ok: false, error: 'Sign-in is not available right now.' };
      try {
        await backend.registerWithPassword(email.trim(), password);
        return { ok: true };
      } catch (e) {
        return { ok: false, error: authErrorMessage(e) };
      }
    },
    [],
  );

  const signInWithGoogle = useCallback(async (): Promise<AuthResult> => {
    const backend = backendRef.current;
    if (!backend) return { ok: false, error: 'Sign-in is not available right now.' };
    try {
      await backend.signInWithGoogle();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: authErrorMessage(e) };
    }
  }, []);

  const setUsername = useCallback(async (username: string): Promise<AuthResult> => {
    const backend = backendRef.current;
    const u = userRef.current;
    if (!backend || !u) return { ok: false, error: 'Not signed in.' };
    const lower = username.toLowerCase().trim();
    try {
      const available = await backend.checkUsernameAvailable(lower);
      if (!available) return { ok: false, error: 'That username is already taken.' };
      await backend.claimUsername(u.id, lower);
      setUser((prev) => (prev ? { ...prev, username: lower } : null));
      return { ok: true };
    } catch (e) {
      // Catch race-condition permission errors (someone else claimed it first).
      const code =
        e && typeof e === 'object' && 'code' in e ? String((e as { code: unknown }).code) : '';
      if (code === 'permission-denied') return { ok: false, error: 'That username is already taken.' };
      return { ok: false, error: e instanceof Error ? e.message : 'Something went wrong.' };
    }
  }, []);

  const signOut = useCallback(async () => {
    hydratedForRef.current = null;
    try {
      await backendRef.current?.signOutUser();
    } catch {
      /* ignore */
    }
    setUser(null);
  }, []);

  const needsUsername = !!user && !hydrating && user.username === null;

  const value = useMemo<AuthContextValue>(
    () => ({
      configured,
      user,
      hydrating,
      needsUsername,
      signInWithEmail,
      signInWithPassword,
      registerWithPassword,
      signInWithGoogle,
      setUsername,
      signOut,
    }),
    [
      configured,
      user,
      hydrating,
      needsUsername,
      signInWithEmail,
      signInWithPassword,
      registerWithPassword,
      signInWithGoogle,
      setUsername,
      signOut,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
