/**
 * App settings & accessibility preferences (local).
 *
 * Pure defaults + merge helpers (testable); a thin localStorage wrapper and an
 * `applySettings` that toggles document-level classes consumed by globals.css
 * (high contrast, larger text, a manual reduced-motion override on top of the
 * OS `prefers-reduced-motion`). Sound stays in its own legacy key (`bk_sound`)
 * but is mirrored here so one screen controls everything.
 */

const KEY = 'bk_settings_v1';
const SOUND_KEY = 'bk_sound';

export interface AppSettings {
  sound: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
  largeText: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  sound: true,
  reducedMotion: false,
  highContrast: false,
  largeText: false,
};

/** Pure: merge a partial draft onto the defaults, coercing to booleans. */
export function mergeSettings(draft: Partial<AppSettings> | null | undefined): AppSettings {
  const d = draft ?? {};
  return {
    sound: d.sound ?? DEFAULT_SETTINGS.sound,
    reducedMotion: d.reducedMotion ?? DEFAULT_SETTINGS.reducedMotion,
    highContrast: d.highContrast ?? DEFAULT_SETTINGS.highContrast,
    largeText: d.largeText ?? DEFAULT_SETTINGS.largeText,
  };
}

export function getSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(KEY);
    const base = mergeSettings(raw ? (JSON.parse(raw) as Partial<AppSettings>) : null);
    // Honour a pre-existing legacy sound flag if present.
    const legacy = localStorage.getItem(SOUND_KEY);
    if (legacy !== null) base.sound = legacy !== 'off' && legacy !== 'false';
    return base;
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: AppSettings): AppSettings {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
    // Mirror sound into the legacy key the sound engine reads.
    localStorage.setItem(SOUND_KEY, settings.sound ? 'on' : 'off');
  } catch {
    /* storage unavailable */
  }
  applySettings(settings);
  return settings;
}

/** Toggle the document-level a11y classes consumed by globals.css. */
export function applySettings(settings: AppSettings): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.toggle('a11y-contrast', settings.highContrast);
  root.classList.toggle('a11y-large-text', settings.largeText);
  root.classList.toggle('a11y-reduce-motion', settings.reducedMotion);
}

/** Apply persisted settings at boot. */
export function hydrateSettings(): void {
  applySettings(getSettings());
}
