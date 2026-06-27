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
}

interface AuthContextValue {
  /** Whether sign-in is available in this build (Firebase config present). */
  configured: boolean;
  user: AuthUser | null;
  /** True while restoring a signed-in session's progress on load. */
  hydrating: boolean;
  /** Send a passwordless sign-in (email) link. */
  signInWithEmail: (email: string) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const PUSH_DEBOUNCE_MS = 1500;

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

  /** Pull remote progress, merge with local, and reconcile (once per user). */
  const applySession = useCallback(async (u: AuthUser) => {
    setUser(u);
    if (hydratedForRef.current === u.id) return;
    hydratedForRef.current = u.id;
    setHydrating(true);
    try {
      const backend = backendRef.current;
      if (backend) {
        const remote = await backend.pullProgress(u.id);
        const { result, shouldPush } = reconcileProgress(readLocalProgress(), remote);
        writeLocalProgress(result);
        if (shouldPush) await backend.pushProgress(u.id, result);
      }
    } catch {
      /* offline / transient — local play is unaffected */
    } finally {
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

  const signInWithEmail = useCallback(async (email: string) => {
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
      return { ok: false, error: e instanceof Error ? e.message : 'Could not send the link.' };
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

  const value = useMemo<AuthContextValue>(
    () => ({ configured, user, hydrating, signInWithEmail, signOut }),
    [configured, user, hydrating, signInWithEmail, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
