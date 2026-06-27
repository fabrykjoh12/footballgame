/**
 * StatsProvider — persistent career stats across matches.
 *
 * Loads from localStorage on mount, exposes the running totals plus a `record`
 * action that folds a finished match in and persists the result.
 */

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { MatchSummary } from '../../types/match.ts';
import {
  emptyStats,
  recordMatch,
  type PlayerStats,
} from '../../engine/stats.ts';
import { loadJSON, saveJSON } from '../../lib/storage.ts';

const STORAGE_KEY = 'ball-knowledge:stats';

interface StatsContext {
  stats: PlayerStats;
  /** Fold a finished match in (idempotent per summary instance). */
  record: (summary: MatchSummary) => void;
  reset: () => void;
}

const Ctx = createContext<StatsContext | null>(null);

export function StatsProvider({ children }: { children: ReactNode }) {
  const [stats, setStats] = useState<PlayerStats>(() =>
    loadJSON<PlayerStats>(STORAGE_KEY, emptyStats()),
  );
  // Guard against double-recording the same match (StrictMode / re-renders).
  const lastRecorded = useRef<MatchSummary | null>(null);

  const record = useCallback((summary: MatchSummary) => {
    if (lastRecorded.current === summary) return;
    lastRecorded.current = summary;
    setStats((prev) => {
      const next = recordMatch(prev, summary);
      saveJSON(STORAGE_KEY, next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    lastRecorded.current = null;
    const fresh = emptyStats();
    saveJSON(STORAGE_KEY, fresh);
    setStats(fresh);
  }, []);

  return <Ctx.Provider value={{ stats, record, reset }}>{children}</Ctx.Provider>;
}

export function useStats(): StatsContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useStats must be used within a StatsProvider');
  return ctx;
}
