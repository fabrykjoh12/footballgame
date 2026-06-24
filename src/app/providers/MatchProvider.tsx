/**
 * MatchProvider — exposes the match engine to the component tree via context.
 * One source of truth; screens read from here rather than threading props.
 */

import { createContext, useContext, type ReactNode } from 'react';
import { useMatchEngine, type MatchEngine } from '../../engine/useMatchEngine.tsx';

const MatchContext = createContext<MatchEngine | null>(null);

export function MatchProvider({ children }: { children: ReactNode }) {
  const engine = useMatchEngine();
  return <MatchContext.Provider value={engine}>{children}</MatchContext.Provider>;
}

export function useMatch(): MatchEngine {
  const ctx = useContext(MatchContext);
  if (!ctx) throw new Error('useMatch must be used within a MatchProvider');
  return ctx;
}
