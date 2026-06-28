/**
 * Daily Connections progress — a solved-day streak over the one deterministic
 * Connections puzzle per calendar day. Storage + streak only (no puzzle data),
 * so the home card can read it without pulling the Connections bank into the
 * main bundle. The date→puzzle picker (`dailyConnection`) lives in
 * `connections.ts`, alongside the puzzle data it needs.
 */

import { previousDay, todayString } from './seededRandom';

const KEY = 'bk_daily_conn_v1';

export interface DailyConnectionsState {
  lastPlayedDate: string | null; // YYYY-MM-DD
  /** Consecutive days solved (0 if today was missed/failed). */
  streak: number;
  bestStreak: number;
  lastSolved: boolean;
  playsTotal: number;
  solvedTotal: number;
}

const EMPTY: DailyConnectionsState = {
  lastPlayedDate: null,
  streak: 0,
  bestStreak: 0,
  lastSolved: false,
  playsTotal: 0,
  solvedTotal: 0,
};

export function getDailyConnectionsState(): DailyConnectionsState {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...EMPTY, ...(JSON.parse(raw) as DailyConnectionsState) } : { ...EMPTY };
  } catch {
    return { ...EMPTY };
  }
}

function save(state: DailyConnectionsState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable */
  }
}

export function hasPlayedDailyConnectionToday(
  state: DailyConnectionsState = getDailyConnectionsState(),
  today: string = todayString(),
): boolean {
  return state.lastPlayedDate === today;
}

/**
 * Pure streak rule: a solve extends the streak when yesterday was the last play
 * (else restarts at 1); a miss/fail resets it to 0.
 */
export function nextConnectionStreak(
  lastPlayedDate: string | null,
  prevStreak: number,
  solved: boolean,
  today: string,
): number {
  if (!solved) return 0;
  if (lastPlayedDate === previousDay(today)) return prevStreak + 1;
  return 1;
}

/** Pure: fold today's result into the prior state (once per day). */
export function foldDailyConnectionResult(
  prev: DailyConnectionsState,
  solved: boolean,
  today: string,
): DailyConnectionsState {
  if (prev.lastPlayedDate === today) return prev; // already recorded today
  const streak = nextConnectionStreak(prev.lastPlayedDate, prev.streak, solved, today);
  return {
    lastPlayedDate: today,
    streak,
    bestStreak: Math.max(prev.bestStreak, streak),
    lastSolved: solved,
    playsTotal: prev.playsTotal + 1,
    solvedTotal: prev.solvedTotal + (solved ? 1 : 0),
  };
}

/** Record today's daily Connections result. Once per day (first attempt counts). */
export function recordDailyConnectionResult(
  solved: boolean,
  today: string = todayString(),
): DailyConnectionsState {
  const next = foldDailyConnectionResult(getDailyConnectionsState(), solved, today);
  save(next);
  return next;
}
