/**
 * Daily quests — three rotating goals per day that nudge the player across the
 * game's modes ("win a match", "answer 25 correct", "play today's Daily").
 *
 * Selection is deterministic per date (a date+group hash, no Math.random), so
 * everyone gets the same trio on a given day. Progress is derived, not event-
 * sourced: at the first read each day a BASELINE snapshot of the lifetime stats
 * is stored, and "today's" progress for a counter metric is `current - baseline`.
 * Boolean daily metrics (played the Daily Rival / solved Daily Connections) are
 * read live. No match-engine or recording-site changes required.
 *
 * The selection + evaluation maths are pure and unit-tested; the storage wrapper
 * reads localStorage and the live daily state.
 */

import { getProfileStats } from './profileStats';
import { getDailyState, hasPlayedToday } from './dailyChallenge';
import {
  getDailyConnectionsState,
  hasPlayedDailyConnectionToday,
} from './dailyConnections';
import { todayString } from './seededRandom';
import { notifyProgressChanged } from './progress';

const KEY = 'bk_quests_v1';

export type QuestMetric = 'matches' | 'wins' | 'correct' | 'daily_rival' | 'daily_conn';

export interface QuestDef {
  id: string;
  label: string;
  emoji: string;
  metric: QuestMetric;
  target: number;
}

/**
 * One quest is drawn from each group every day, so the trio always spans
 * "show up" (engage), "do well" (skill) and "do a daily" (daily).
 */
const GROUPS: Record<'engage' | 'skill' | 'daily', QuestDef[]> = {
  engage: [
    { id: 'play1', label: 'Play a match', emoji: '⚽', metric: 'matches', target: 1 },
    { id: 'play2', label: 'Play 2 matches', emoji: '⚽', metric: 'matches', target: 2 },
    { id: 'correct15', label: 'Answer 15 questions correctly', emoji: '🎯', metric: 'correct', target: 15 },
    { id: 'correct25', label: 'Answer 25 questions correctly', emoji: '🎯', metric: 'correct', target: 25 },
  ],
  skill: [
    { id: 'win1', label: 'Win a match', emoji: '🏆', metric: 'wins', target: 1 },
    { id: 'win2', label: 'Win 2 matches', emoji: '🏆', metric: 'wins', target: 2 },
  ],
  daily: [
    { id: 'daily_rival', label: "Play today's Daily Rival", emoji: '📅', metric: 'daily_rival', target: 1 },
    { id: 'daily_conn', label: 'Solve Daily Connections', emoji: '🔗', metric: 'daily_conn', target: 1 },
  ],
};

const GROUP_ORDER: Array<keyof typeof GROUPS> = ['engage', 'skill', 'daily'];

export const ALL_QUESTS: QuestDef[] = GROUP_ORDER.flatMap((g) => GROUPS[g]);

export function questById(id: string): QuestDef | undefined {
  return ALL_QUESTS.find((q) => q.id === id);
}

/** Small deterministic string hash (FNV-1a), kept local so quests need no RNG. */
function hashStr(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** The three quest ids for a given date (one per group, deterministic). */
export function pickDailyQuestIds(dateStr: string): string[] {
  return GROUP_ORDER.map((g) => {
    const group = GROUPS[g];
    return group[hashStr(`${dateStr}:${g}`) % group.length].id;
  });
}

/* ------------------------------------------------------------------ */
/* Pure progress evaluation                                            */
/* ------------------------------------------------------------------ */

export interface QuestContext {
  matchesToday: number;
  winsToday: number;
  correctToday: number;
  dailyRivalDone: boolean;
  dailyConnDone: boolean;
}

/** Raw "today" value for a metric, before clamping to the target. */
export function metricValue(metric: QuestMetric, ctx: QuestContext): number {
  switch (metric) {
    case 'matches':
      return Math.max(0, ctx.matchesToday);
    case 'wins':
      return Math.max(0, ctx.winsToday);
    case 'correct':
      return Math.max(0, ctx.correctToday);
    case 'daily_rival':
      return ctx.dailyRivalDone ? 1 : 0;
    case 'daily_conn':
      return ctx.dailyConnDone ? 1 : 0;
  }
}

export interface QuestProgress {
  quest: QuestDef;
  /** Clamped to [0, target]. */
  current: number;
  complete: boolean;
}

export function evaluateQuest(quest: QuestDef, ctx: QuestContext): QuestProgress {
  const raw = metricValue(quest.metric, ctx);
  const current = Math.min(quest.target, raw);
  return { quest, current, complete: raw >= quest.target };
}

/* ------------------------------------------------------------------ */
/* Per-day storage (baseline snapshot + chosen quests)                 */
/* ------------------------------------------------------------------ */

interface QuestState {
  date: string;
  questIds: string[];
  /** Lifetime-stat snapshot taken at the start of the day. */
  baseline: { matches: number; wins: number; correct: number };
}

function snapshotBaseline(): QuestState['baseline'] {
  const p = getProfileStats();
  return { matches: p.matchesPlayed, wins: p.wins, correct: p.totalCorrect };
}

function read(): QuestState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as QuestState;
    if (!parsed || typeof parsed.date !== 'string' || !Array.isArray(parsed.questIds)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function write(state: QuestState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    notifyProgressChanged();
  } catch {
    /* storage unavailable */
  }
}

/**
 * Ensure today's quests + baseline exist (rolling over at a date change). Call
 * once at boot so the baseline is captured before the player starts a match.
 */
export function ensureQuestsForToday(today: string = todayString()): QuestState {
  const existing = read();
  if (existing && existing.date === today) return existing;
  const fresh: QuestState = {
    date: today,
    questIds: pickDailyQuestIds(today),
    baseline: snapshotBaseline(),
  };
  write(fresh);
  return fresh;
}

/** Build the live progress context from current stats minus today's baseline. */
function liveContext(state: QuestState): QuestContext {
  const p = getProfileStats();
  return {
    matchesToday: p.matchesPlayed - state.baseline.matches,
    winsToday: p.wins - state.baseline.wins,
    correctToday: p.totalCorrect - state.baseline.correct,
    dailyRivalDone: hasPlayedToday(getDailyState()),
    dailyConnDone: hasPlayedDailyConnectionToday(getDailyConnectionsState()),
  };
}

/** Today's three quests with live progress. */
export function getDailyQuests(today: string = todayString()): QuestProgress[] {
  const state = ensureQuestsForToday(today);
  const ctx = liveContext(state);
  return state.questIds
    .map((id) => questById(id))
    .filter((q): q is QuestDef => q != null)
    .map((q) => evaluateQuest(q, ctx));
}

/** How many of today's quests are complete. */
export function completedQuestCount(today: string = todayString()): number {
  return getDailyQuests(today).filter((q) => q.complete).length;
}
