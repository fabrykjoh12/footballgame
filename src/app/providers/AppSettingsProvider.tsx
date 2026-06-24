/**
 * AppSettingsProvider — cross-cutting app state (player name, difficulty,
 * sound) persisted to localStorage. Independent of any match.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { Difficulty } from '../../types/match.ts';

export interface AppSettings {
  playerName: string;
  difficulty: Difficulty;
  soundOn: boolean;
}

interface AppSettingsContext extends AppSettings {
  update: (patch: Partial<AppSettings>) => void;
}

const DEFAULTS: AppSettings = {
  playerName: 'You',
  difficulty: 'pro',
  soundOn: true,
};

const STORAGE_KEY = 'ball-knowledge:settings';

function load(): AppSettings {
  if (typeof localStorage === 'undefined') return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return { ...DEFAULTS, ...parsed };
  } catch {
    return DEFAULTS;
  }
}

const Ctx = createContext<AppSettingsContext | null>(null);

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(load);

  useEffect(() => {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      /* storage may be unavailable (private mode) — non-fatal */
    }
  }, [settings]);

  const update = (patch: Partial<AppSettings>) =>
    setSettings((s) => ({ ...s, ...patch }));

  return <Ctx.Provider value={{ ...settings, update }}>{children}</Ctx.Provider>;
}

export function useSettings(): AppSettingsContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSettings must be used within an AppSettingsProvider');
  return ctx;
}
