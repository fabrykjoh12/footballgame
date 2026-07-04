/**
 * The Scout — daily rule + local progress.
 *
 * One seeded secret rule per calendar day (same for every player, like the
 * Daily Challenge). Solo: probe as often as you like, but you get three
 * accusations — crack the rule to keep the solved-day streak alive; your score
 * is the probe count (lower is better). Progress persists in `bk_scout_v1`;
 * folds are pure, mirroring the dailyConnections pattern.
 */

import { hashString, previousDay, todayString } from '../seededRandom';
import { scoutCatalog, type ScoutCategory } from './categories';

export const SCOUT_DAILY_MAX_ACCUSATIONS = 3;

/** The one secret rule for a calendar day — deterministic across devices. */
export function dailyScoutCategory(dateStr: string = todayString()): ScoutCategory {
  const catalog = scoutCatalog();
  return catalog[hashString(`bk-scout:${dateStr}`) % catalog.length];
}

/* ------------------------------------------------------------------ */
/* Progress                                                            */
/* ------------------------------------------------------------------ */

const KEY = 'bk_scout_v1';

export interface ScoutDailyState {
  lastPlayedDate: string | null; // YYYY-MM-DD
  /** Consecutive days solved (0 if the last day was missed/failed). */
  streak: number;
  bestStreak: number;
  lastSolved: boolean;
  playsTotal: number;
  solvedTotal: number;
  /** Fewest probes ever needed to crack a daily rule. */
  bestProbes: number | null;
}

export interface ScoutProgress {
  /** Vs-CPU duels only — hot-seat games have no owner to credit. */
  duelsPlayed: number;
  duelsWon: number;
  daily: ScoutDailyState;
}

const EMPTY: ScoutProgress = {
  duelsPlayed: 0,
  duelsWon: 0,
  daily: {
    lastPlayedDate: null,
    streak: 0,
    bestStreak: 0,
    lastSolved: false,
    playsTotal: 0,
    solvedTotal: 0,
    bestProbes: null,
  },
};

export function getScoutProgress(): ScoutProgress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(EMPTY);
    const parsed = JSON.parse(raw) as Partial<ScoutProgress>;
    return { ...EMPTY, ...parsed, daily: { ...EMPTY.daily, ...(parsed.daily ?? {}) } };
  } catch {
    return structuredClone(EMPTY);
  }
}

function save(progress: ScoutProgress): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(progress));
  } catch {
    /* storage unavailable */
  }
}

export function hasPlayedDailyScoutToday(
  progress: ScoutProgress = getScoutProgress(),
  today: string = todayString(),
): boolean {
  return progress.daily.lastPlayedDate === today;
}

/** Pure: fold today's daily result into prior progress (once per day). */
export function foldScoutDaily(
  prev: ScoutProgress,
  solved: boolean,
  probes: number,
  today: string,
): ScoutProgress {
  const d = prev.daily;
  if (d.lastPlayedDate === today) return prev; // already recorded today
  const streak = !solved ? 0 : d.lastPlayedDate === previousDay(today) ? d.streak + 1 : 1;
  return {
    ...prev,
    daily: {
      lastPlayedDate: today,
      streak,
      bestStreak: Math.max(d.bestStreak, streak),
      lastSolved: solved,
      playsTotal: d.playsTotal + 1,
      solvedTotal: d.solvedTotal + (solved ? 1 : 0),
      bestProbes: solved ? Math.min(d.bestProbes ?? Infinity, probes) : d.bestProbes,
    },
  };
}

/** Pure: fold a finished vs-CPU duel into prior progress. */
export function foldScoutDuel(prev: ScoutProgress, won: boolean): ScoutProgress {
  return { ...prev, duelsPlayed: prev.duelsPlayed + 1, duelsWon: prev.duelsWon + (won ? 1 : 0) };
}

export function recordScoutDaily(
  solved: boolean,
  probes: number,
  today: string = todayString(),
): ScoutProgress {
  const next = foldScoutDaily(getScoutProgress(), solved, probes, today);
  save(next);
  return next;
}

export function recordScoutDuel(won: boolean): ScoutProgress {
  const next = foldScoutDuel(getScoutProgress(), won);
  save(next);
  return next;
}

/* ------------------------------------------------------------------ */
/* Share text                                                          */
/* ------------------------------------------------------------------ */

const SITE_URL = 'https://fabrykjoh12.github.io/footballgame/';

export function buildScoutDailyShareText(o: {
  solved: boolean;
  probes: number;
  wrongAccusations: number;
  streak: number;
}): string {
  const head = o.solved
    ? `🔍 The Scout — cracked today's secret rule in ${o.probes} probe${o.probes === 1 ? '' : 's'}${
        o.wrongAccusations > 0 ? ` (${o.wrongAccusations} wrong accusation${o.wrongAccusations === 1 ? '' : 's'})` : ''
      }.`
    : `🔍 The Scout — today's secret rule got away from me.`;
  const streak = o.solved && o.streak > 1 ? ` 🔥 ${o.streak}-day streak.` : '';
  return `${head}${streak} Can you deduce it? ${SITE_URL}#daily-scout`;
}

export function buildScoutDuelShareText(o: { won: boolean; probes: number }): string {
  const head = o.won
    ? `🔍 The Scout — I deduced the CPU's secret recruitment rule in ${o.probes} probe${o.probes === 1 ? '' : 's'}.`
    : `🔍 The Scout — the CPU cracked my secret rule first.`;
  return `${head} Football deduction duel: ${SITE_URL}#scout`;
}
