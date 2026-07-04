/**
 * Top-level navigation state, shared between the app shell (which draws the
 * sidebar / mobile drawer) and the screen router. The URL hash stays the source
 * of truth so the browser Back button and deep links keep working — this just
 * lifts the view↔hash sync out of `Screens` so the sidebar can read/drive it.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { hashToView, viewToHash, type View } from '../lib/viewRoute';

interface NavContextValue {
  view: View;
  navigate: (view: View) => void;
}

const NavContext = createContext<NavContextValue | null>(null);

export function NavProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<View>(() =>
    typeof window === 'undefined' ? 'home' : hashToView(window.location.hash),
  );

  // Back/forward and any programmatic hash change drive the view.
  useEffect(() => {
    const onHash = () => setView(hashToView(window.location.hash));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const navigate = useCallback((next: View) => {
    if (next === 'home') {
      // Clear the hash without leaving a dangling '#'. pushState fires no
      // hashchange event, so sync state by hand.
      window.history.pushState(null, '', window.location.pathname + window.location.search);
      setView('home');
    } else {
      window.location.hash = viewToHash(next); // fires hashchange → state sync
    }
  }, []);

  return <NavContext.Provider value={{ view, navigate }}>{children}</NavContext.Provider>;
}

export function useNav(): NavContextValue {
  const ctx = useContext(NavContext);
  if (!ctx) throw new Error('useNav must be used within a NavProvider');
  return ctx;
}
