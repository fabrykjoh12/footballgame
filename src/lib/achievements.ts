/**
 * Achievements — football-flavoured badges derived from the player's lifetime
 * profile, Daily Challenge streak, and head-to-head records. The unlock rules
 * are pure (testable); earned ids are cached locally so we can detect the moment
 * one is freshly unlocked (for a celebratory toast) after a match.
 */

import type { ProfileStats } from './profileStats';
import { winRate, lifetimeAccuracy, getProfileStats } from './profileStats';
import type { DailyState } from './dailyChallenge';
import { getDailyState } from './dailyChallenge';
import type { HeadToHeadStore } from './headToHead';
import { getHeadToHead } from './headToHead';

const KEY = 'bk_achievements_v1';

export interface AchievementContext {
  profile: ProfileStats;
  daily: DailyState;
  h2h: HeadToHeadStore;
}

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  /** Emoji shown on the badge (no club crests / photos — house rule). */
  icon: string;
  earned: (ctx: AchievementContext) => boolean;
}

/** Ordered easy→prestigious so the UI reads as a ladder. */
export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'debut',
    title: 'Debut',
    description: 'Play your first match.',
    icon: '⚽',
    earned: (c) => c.profile.matchesPlayed >= 1,
  },
  {
    id: 'first_win',
    title: 'First Three Points',
    description: 'Win a match.',
    icon: '🎉',
    earned: (c) => c.profile.wins >= 1,
  },
  {
    id: 'lightning',
    title: 'Lightning Reflexes',
    description: 'Answer correctly in under 2 seconds.',
    icon: '⚡',
    earned: (c) => c.profile.fastestAnswerMs != null && c.profile.fastestAnswerMs <= 2000,
  },
  {
    id: 'on_fire',
    title: 'On Fire',
    description: 'Hit a 5-answer streak in a match.',
    icon: '🔥',
    earned: (c) => c.profile.bestStreak >= 5,
  },
  {
    id: 'regular',
    title: 'Season Ticket',
    description: 'Play 10 matches.',
    icon: '🎟️',
    earned: (c) => c.profile.matchesPlayed >= 10,
  },
  {
    id: 'goal_machine',
    title: 'Goal Machine',
    description: 'Score 25 goals across all matches.',
    icon: '🥅',
    earned: (c) => c.profile.goalsScored >= 25,
  },
  {
    id: 'centurion',
    title: 'Centurion',
    description: 'Answer 100 questions correctly.',
    icon: '💯',
    earned: (c) => c.profile.totalCorrect >= 100,
  },
  {
    id: 'rivalry',
    title: 'Local Derby',
    description: 'Play the same opponent 3 times.',
    icon: '🤝',
    earned: (c) => Object.values(c.h2h).some((r) => r.played >= 3),
  },
  {
    id: 'daily_devotee',
    title: 'Daily Devotee',
    description: 'Keep a 7-day Daily Challenge streak.',
    icon: '📅',
    earned: (c) => c.daily.streak >= 7,
  },
  {
    id: 'contender',
    title: 'Title Contender',
    description: 'Reach a 60% win rate over 10+ matches.',
    icon: '🏅',
    earned: (c) => c.profile.matchesPlayed >= 10 && winRate(c.profile) >= 60,
  },
  {
    id: 'scholar',
    title: 'Ball Scholar',
    description: 'Reach 75% lifetime accuracy over 50+ questions.',
    icon: '🎓',
    earned: (c) => c.profile.totalQuestions >= 50 && lifetimeAccuracy(c.profile) >= 75,
  },
  {
    id: 'veteran',
    title: 'Club Legend',
    description: 'Play 50 matches.',
    icon: '👑',
    earned: (c) => c.profile.matchesPlayed >= 50,
  },
];

/** Fired when one or more achievements are freshly unlocked. */
export const ACHIEVEMENT_EVENT = 'bk:achievement-unlocked';

/** Pure: the set of achievement ids earned for a given context. */
export function evaluateAchievements(ctx: AchievementContext): Set<string> {
  const earned = new Set<string>();
  for (const a of ACHIEVEMENTS) {
    if (a.earned(ctx)) earned.add(a.id);
  }
  return earned;
}

function readStored(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function writeStored(ids: string[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    /* storage unavailable */
  }
}

/** Build the context from current local progress. */
export function currentContext(): AchievementContext {
  return { profile: getProfileStats(), daily: getDailyState(), h2h: getHeadToHead() };
}

/** The full list with an `unlocked` flag, for rendering the badge grid. */
export function listAchievements(
  ctx: AchievementContext = currentContext(),
): Array<AchievementDef & { unlocked: boolean }> {
  const earned = evaluateAchievements(ctx);
  return ACHIEVEMENTS.map((a) => ({ ...a, unlocked: earned.has(a.id) }));
}

/**
 * Re-evaluate achievements against current progress, persist the earned set,
 * and return any that were *newly* unlocked since the last refresh. Call this
 * after a match finishes to drive an unlock toast.
 */
export function refreshAchievements(): AchievementDef[] {
  if (typeof localStorage === 'undefined') return [];
  const earned = evaluateAchievements(currentContext());
  const before = new Set(readStored());
  const newly = ACHIEVEMENTS.filter((a) => earned.has(a.id) && !before.has(a.id));
  writeStored([...earned]);
  if (newly.length && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(ACHIEVEMENT_EVENT, { detail: newly.map((a) => a.id) }));
  }
  return newly;
}

export function earnedCount(ctx: AchievementContext = currentContext()): number {
  return evaluateAchievements(ctx).size;
}
