/**
 * Leagues context — create / join / list private friend leagues and load a
 * league's standings. Online layer only (needs Firebase sign-in); degrades to a
 * gentle "sign in to use leagues" state otherwise. Mirrors the FriendsProvider
 * shape: local cache for instant display, Firestore for the source of truth.
 */

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
import { useAuth } from './AuthProvider';
import {
  computeStandings,
  generateLeagueCode,
  normalizeLeagueCode,
  type League,
  type StandingRow,
} from '../lib/leagues';
import { getCachedLeagues, setCachedLeagues } from '../lib/leaguesLocal';
import { uid as makeId } from '../lib/id';

type Backend = typeof import('../services/firebaseBackend');

interface LeaguesContextValue {
  online: boolean;
  leagues: League[];
  busy: boolean;
  createLeague: (name: string) => Promise<{ ok: boolean; error?: string }>;
  joinByCode: (code: string) => Promise<{ ok: boolean; error?: string }>;
  loadStandings: (leagueId: string) => Promise<{ league: League; standings: StandingRow[] } | null>;
  refresh: () => Promise<void>;
}

const LeaguesContext = createContext<LeaguesContextValue | null>(null);

function displayName(email: string | null): string {
  try {
    const stored = localStorage.getItem('bk_name');
    if (stored && stored.trim()) return stored.trim();
  } catch {
    /* ignore */
  }
  return email?.split('@')[0] ?? 'Player';
}

export function LeaguesProvider({ children }: { children: ReactNode }) {
  const { configured, user } = useAuth();
  const online = configured && !!user;

  const [leagues, setLeagues] = useState<League[]>(() => getCachedLeagues());
  const [busy, setBusy] = useState(false);
  const backendRef = useRef<Backend | null>(null);

  const loadBackend = useCallback(async (): Promise<Backend | null> => {
    if (!online) return null;
    if (backendRef.current) return backendRef.current;
    try {
      backendRef.current = await import('../services/firebaseBackend');
      return backendRef.current;
    } catch {
      return null;
    }
  }, [online]);

  const refresh = useCallback(async () => {
    if (!online || !user) return;
    const backend = await loadBackend();
    if (!backend) return;
    try {
      const docs = await backend.listLeagues(user.id);
      const mapped: League[] = docs.map((d) => ({
        id: d.id,
        name: d.name,
        code: d.code,
        ownerUid: d.ownerUid,
        members: d.members,
        createdAt: d.createdAt,
      }));
      setLeagues(mapped);
      setCachedLeagues(mapped);
    } catch {
      /* keep the cached view */
    }
  }, [online, user, loadBackend]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createLeague = useCallback(
    async (name: string): Promise<{ ok: boolean; error?: string }> => {
      if (!online || !user) return { ok: false, error: 'Sign in to create a league.' };
      const trimmed = name.trim();
      if (!trimmed) return { ok: false, error: 'Give your league a name.' };
      const backend = await loadBackend();
      if (!backend) return { ok: false, error: 'Leagues are unavailable right now.' };
      setBusy(true);
      try {
        const id = makeId('lg');
        const code = generateLeagueCode();
        const owner = { uid: user.id, name: displayName(user.email) };
        await backend.createLeague({ id, name: trimmed, code, owner });
        await refresh();
        return { ok: true };
      } catch {
        return { ok: false, error: 'Could not create the league.' };
      } finally {
        setBusy(false);
      }
    },
    [online, user, loadBackend, refresh],
  );

  const joinByCode = useCallback(
    async (code: string): Promise<{ ok: boolean; error?: string }> => {
      if (!online || !user) return { ok: false, error: 'Sign in to join a league.' };
      const backend = await loadBackend();
      if (!backend) return { ok: false, error: 'Leagues are unavailable right now.' };
      setBusy(true);
      try {
        const id = await backend.resolveLeagueCode(normalizeLeagueCode(code));
        if (!id) return { ok: false, error: 'No league found with that code.' };
        await backend.joinLeague(id, { uid: user.id, name: displayName(user.email) });
        await refresh();
        return { ok: true };
      } catch {
        return { ok: false, error: 'Could not join that league.' };
      } finally {
        setBusy(false);
      }
    },
    [online, user, loadBackend, refresh],
  );

  const loadStandings = useCallback(
    async (leagueId: string) => {
      const backend = await loadBackend();
      if (!backend) return null;
      try {
        const [doc, results] = await Promise.all([
          backend.getLeague(leagueId),
          backend.fetchLeagueResults(leagueId),
        ]);
        if (!doc) return null;
        const league: League = {
          id: doc.id,
          name: doc.name,
          code: doc.code,
          ownerUid: doc.ownerUid,
          members: doc.members,
          createdAt: doc.createdAt,
        };
        return { league, standings: computeStandings(doc.members, results) };
      } catch {
        return null;
      }
    },
    [loadBackend],
  );

  const value = useMemo<LeaguesContextValue>(
    () => ({ online, leagues, busy, createLeague, joinByCode, loadStandings, refresh }),
    [online, leagues, busy, createLeague, joinByCode, loadStandings, refresh],
  );

  return <LeaguesContext.Provider value={value}>{children}</LeaguesContext.Provider>;
}

export function useLeagues(): LeaguesContextValue {
  const ctx = useContext(LeaguesContext);
  if (!ctx) throw new Error('useLeagues must be used within a LeaguesProvider');
  return ctx;
}
