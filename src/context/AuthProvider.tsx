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
import type { SupabaseClient } from '@supabase/supabase-js';
import { isSupabaseConfigured } from '../lib/realtimeConfig';
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
  /** Whether sign-in is available in this build (Supabase keys present). */
  configured: boolean;
  user: AuthUser | null;
  /** True while restoring a signed-in session's progress on load. */
  hydrating: boolean;
  /** Send a passwordless magic-link to this email. */
  signInWithEmail: (email: string) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const PUSH_DEBOUNCE_MS = 1500;

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isSupabaseConfigured;
  const [user, setUser] = useState<AuthUser | null>(null);
  const [hydrating, setHydrating] = useState<boolean>(configured);

  const clientRef = useRef<SupabaseClient | null>(null);
  const cloudRef = useRef<typeof import('../services/cloudSync') | null>(null);
  const userRef = useRef<AuthUser | null>(null);
  const hydratedForRef = useRef<string | null>(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  /** Pull remote progress, merge with local, and reconcile (once per user). */
  const applySession = useCallback(async (id: string, email: string | null) => {
    setUser({ id, email });
    if (hydratedForRef.current === id) return;
    hydratedForRef.current = id;
    setHydrating(true);
    try {
      const client = clientRef.current;
      const cloud = cloudRef.current;
      if (client && cloud) {
        const remote = await cloud.pullRemoteProgress(client, id);
        const { result, shouldPush } = reconcileProgress(readLocalProgress(), remote);
        writeLocalProgress(result);
        if (shouldPush) await cloud.pushRemoteProgress(client, id, result);
      }
    } catch {
      /* offline / transient — local play is unaffected */
    } finally {
      setHydrating(false);
    }
  }, []);

  // Boot the auth client + restore any existing session.
  useEffect(() => {
    if (!configured) {
      setHydrating(false);
      return;
    }
    let active = true;
    let unsubscribe = () => {};

    (async () => {
      let client: SupabaseClient | null = null;
      try {
        const mod = await import('../lib/supabaseClient');
        client = mod.getSupabaseClient();
        cloudRef.current = await import('../services/cloudSync');
      } catch {
        client = null;
      }
      if (!active) return;
      if (!client) {
        setHydrating(false);
        return;
      }
      clientRef.current = client;

      const {
        data: { session },
      } = await client.auth.getSession();
      if (!active) return;
      if (session?.user) {
        await applySession(session.user.id, session.user.email ?? null);
      } else {
        setHydrating(false);
      }

      const { data: sub } = client.auth.onAuthStateChange((_event, sess) => {
        const u = sess?.user;
        if (u) {
          void applySession(u.id, u.email ?? null);
        } else {
          hydratedForRef.current = null;
          setUser(null);
          setHydrating(false);
        }
      });
      unsubscribe = () => sub.subscription.unsubscribe();
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
      const client = clientRef.current;
      const cloud = cloudRef.current;
      if (!u || !client || !cloud) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        cloud.pushRemoteProgress(client, u.id, readLocalProgress()).catch(() => {});
      }, PUSH_DEBOUNCE_MS);
    };
    window.addEventListener(PROGRESS_EVENT, onChange);
    return () => {
      window.removeEventListener(PROGRESS_EVENT, onChange);
      clearTimeout(timer);
    };
  }, [configured]);

  const signInWithEmail = useCallback(async (email: string) => {
    const client = clientRef.current;
    if (!client) return { ok: false, error: 'Sign-in is not available right now.' };
    const redirect =
      typeof window !== 'undefined'
        ? window.location.origin + window.location.pathname
        : undefined;
    const { error } = await client.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirect },
    });
    return error ? { ok: false, error: error.message } : { ok: true };
  }, []);

  const signOut = useCallback(async () => {
    hydratedForRef.current = null;
    try {
      await clientRef.current?.auth.signOut();
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
