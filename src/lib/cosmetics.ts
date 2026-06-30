/**
 * Cosmetic unlocks (purely visual — never affect gameplay).
 *
 * A small catalogue of stadium accent colours and pitch patterns, each gated by
 * a derived unlock rule (matches played, wins, feats, achievements, daily
 * streak, career trophies). The selection is persisted and applied as CSS
 * variables consumed by the stadium backdrop. Unlock rules are pure + tested.
 */

import { getProfileStats } from './profileStats';
import { getDailyState } from './dailyChallenge';
import { getFeats, type FeatId } from './feats';
import { earnedCount } from './achievements';
import { getCareer } from './career';
import { notifyProgressChanged } from './progress';

const KEY = 'bk_cosmetics_v1';

export interface CosmeticContext {
  matches: number;
  wins: number;
  bestStreak: number;
  dailyStreak: number;
  achievements: number;
  trophies: number;
  feats: Set<FeatId>;
}

export interface AccentCosmetic {
  id: string;
  name: string;
  /** Hex accent colour. */
  hex: string;
  unlockLabel: string;
  unlocked: (c: CosmeticContext) => boolean;
}

export interface PatternCosmetic {
  id: string;
  name: string;
  unlockLabel: string;
  unlocked: (c: CosmeticContext) => boolean;
}

const ALWAYS = () => true;

export const ACCENTS: AccentCosmetic[] = [
  { id: 'neon', name: 'Neon Green', hex: '#16ff7a', unlockLabel: 'Default', unlocked: ALWAYS },
  {
    id: 'gold',
    name: 'Champion Gold',
    hex: '#ffd24a',
    unlockLabel: 'Win a match',
    unlocked: (c) => c.wins >= 1,
  },
  {
    id: 'sky',
    name: 'Sky Blue',
    hex: '#38bdf8',
    unlockLabel: 'Play 10 matches',
    unlocked: (c) => c.matches >= 10,
  },
  {
    id: 'crimson',
    name: 'Comeback Crimson',
    hex: '#fb7185',
    unlockLabel: 'Win from two goals down',
    unlocked: (c) => c.feats.has('comeback'),
  },
  {
    id: 'ember',
    name: 'Streak Ember',
    hex: '#fb923c',
    unlockLabel: '3-day Daily streak',
    unlocked: (c) => c.dailyStreak >= 3,
  },
  {
    id: 'violet',
    name: 'Devotee Violet',
    hex: '#a78bfa',
    unlockLabel: '7-day Daily streak',
    unlocked: (c) => c.dailyStreak >= 7,
  },
  {
    id: 'aurora',
    name: 'Legend Aurora',
    hex: '#c084fc',
    unlockLabel: '30-day Daily streak',
    unlocked: (c) => c.dailyStreak >= 30,
  },
  {
    id: 'amber',
    name: 'Trophy Amber',
    hex: '#fbbf24',
    unlockLabel: 'Win a career trophy',
    unlocked: (c) => c.trophies >= 1,
  },
  {
    id: 'teal',
    name: 'Scholar Teal',
    hex: '#2dd4bf',
    unlockLabel: 'Unlock 8 achievements',
    unlocked: (c) => c.achievements >= 8,
  },
];

export const PATTERNS: PatternCosmetic[] = [
  { id: 'stripes', name: 'Mowing Stripes', unlockLabel: 'Default', unlocked: ALWAYS },
  {
    id: 'hoops',
    name: 'Centre Hoops',
    unlockLabel: 'Score a perfect match',
    unlocked: (c) => c.feats.has('perfect_match'),
  },
  {
    id: 'check',
    name: 'Checkerboard',
    unlockLabel: 'Hit a 5-answer streak',
    unlocked: (c) => c.bestStreak >= 5,
  },
  {
    id: 'plain',
    name: 'Pristine Turf',
    unlockLabel: 'Play 5 matches',
    unlocked: (c) => c.matches >= 5,
  },
  {
    id: 'diagonal',
    name: 'Diagonal Cut',
    unlockLabel: '14-day Daily streak',
    unlocked: (c) => c.dailyStreak >= 14,
  },
];

export interface CosmeticSelection {
  accent: string;
  pattern: string;
}

export const DEFAULT_SELECTION: CosmeticSelection = { accent: 'neon', pattern: 'stripes' };

export function buildCosmeticContext(): CosmeticContext {
  const profile = getProfileStats();
  const career = getCareer();
  return {
    matches: profile.matchesPlayed,
    wins: profile.wins,
    bestStreak: profile.bestStreak,
    dailyStreak: getDailyState().streak,
    achievements: earnedCount(),
    trophies: career?.trophies.length ?? 0,
    feats: getFeats(),
  };
}

export function isAccentUnlocked(id: string, ctx: CosmeticContext): boolean {
  const a = ACCENTS.find((x) => x.id === id);
  return a ? a.unlocked(ctx) : false;
}

export function isPatternUnlocked(id: string, ctx: CosmeticContext): boolean {
  const p = PATTERNS.find((x) => x.id === id);
  return p ? p.unlocked(ctx) : false;
}

export function getSelection(): CosmeticSelection {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_SELECTION };
    const parsed = JSON.parse(raw) as Partial<CosmeticSelection>;
    return {
      accent: parsed.accent ?? DEFAULT_SELECTION.accent,
      pattern: parsed.pattern ?? DEFAULT_SELECTION.pattern,
    };
  } catch {
    return { ...DEFAULT_SELECTION };
  }
}

/** Resolve a selection to a safe one (falls back if a piece is locked/unknown). */
export function resolveSelection(
  sel: CosmeticSelection,
  ctx: CosmeticContext = buildCosmeticContext(),
): CosmeticSelection {
  return {
    accent: isAccentUnlocked(sel.accent, ctx) ? sel.accent : DEFAULT_SELECTION.accent,
    pattern: isPatternUnlocked(sel.pattern, ctx) ? sel.pattern : DEFAULT_SELECTION.pattern,
  };
}

export function saveSelection(sel: CosmeticSelection): CosmeticSelection {
  const resolved = resolveSelection(sel);
  try {
    localStorage.setItem(KEY, JSON.stringify(resolved));
    notifyProgressChanged();
  } catch {
    /* storage unavailable */
  }
  applyCosmetics(resolved);
  return resolved;
}

function hexToRgba(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/** Build the CSS background-image for a pitch pattern in the accent colour. */
export function patternCss(patternId: string, accentHex: string): string {
  const c = hexToRgba(accentHex, 0.5);
  switch (patternId) {
    case 'hoops':
      return `repeating-radial-gradient(circle at 50% 50%, ${c} 0 1.5px, transparent 1.5px 64px)`;
    case 'check':
      return `repeating-conic-gradient(${c} 0% 25%, transparent 0% 50%) 0 / 80px 80px`;
    case 'diagonal':
      return `repeating-linear-gradient(45deg, ${accentHex} 0 2px, transparent 2px 80px)`;
    case 'plain':
      return 'none';
    case 'stripes':
    default:
      return `repeating-linear-gradient(90deg, ${accentHex} 0 2px, transparent 2px 80px)`;
  }
}

/** Apply the selection as CSS variables read by the stadium backdrop. */
export function applyCosmetics(sel: CosmeticSelection): void {
  if (typeof document === 'undefined') return;
  const accent = ACCENTS.find((a) => a.id === sel.accent) ?? ACCENTS[0];
  const root = document.documentElement;
  root.style.setProperty('--bk-accent', accent.hex);
  root.style.setProperty('--bk-accent-soft', hexToRgba(accent.hex, 0.1));
  root.style.setProperty('--bk-pitch-pattern', patternCss(sel.pattern, accent.hex));
}

/** Apply persisted cosmetics at boot. */
export function hydrateCosmetics(): void {
  applyCosmetics(resolveSelection(getSelection()));
}
