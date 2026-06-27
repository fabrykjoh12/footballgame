/**
 * Daily Challenge — one shared, deterministic puzzle per calendar day. Progress
 * (streak, best score, today's result) is stored locally. The match itself is a
 * normal local game whose settings carry the day's seed.
 */

import type { MatchSettings, Room } from '../types/game';
import { dailySeed, previousDay, todayString } from './seededRandom';
import { notifyProgressChanged } from './progress';

const KEY = 'bk_daily_v1';

export interface DailyState {
  lastPlayedDate: string | null; // YYYY-MM-DD
  streak: number; // consecutive days played
  bestScore: number;
  lastScore: number;
  lastOutcome: 'win' | 'loss' | 'draw' | null;
  playsTotal: number;
}

const EMPTY: DailyState = {
  lastPlayedDate: null,
  streak: 0,
  bestScore: 0,
  lastScore: 0,
  lastOutcome: null,
  playsTotal: 0,
};

export function getDailyState(): DailyState {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...EMPTY, ...(JSON.parse(raw) as DailyState) } : { ...EMPTY };
  } catch {
    return { ...EMPTY };
  }
}

function save(state: DailyState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    notifyProgressChanged();
  } catch {
    /* storage unavailable */
  }
}

export function hasPlayedToday(
  state: DailyState = getDailyState(),
  today: string = todayString(),
): boolean {
  return state.lastPlayedDate === today;
}

/** Pure streak rule: +1 if yesterday was played, otherwise restart at 1. */
export function nextStreak(
  lastPlayedDate: string | null,
  prevStreak: number,
  today: string,
): number {
  if (lastPlayedDate === today) return prevStreak; // unchanged (already counted)
  if (lastPlayedDate === previousDay(today)) return prevStreak + 1;
  return 1;
}

/** Fixed settings for today's challenge (same mode + seed for everyone). */
export function dailySettings(dateStr: string = todayString()): Partial<MatchSettings> {
  return {
    mode: 'serious',
    questionCount: 10,
    questionDurationMs: 15000,
    seed: dailySeed(dateStr),
    isDaily: true,
  };
}

/** Record a finished Daily Challenge for the local player. Once per day. */
export function recordDailyResult(room: Room, localPlayerId: string): DailyState {
  const state = getDailyState();
  const today = todayString();
  if (state.lastPlayedDate === today) return state; // already recorded today

  const me = room.players.find((p) => p.id === localPlayerId);
  if (!me) return state;

  const opp = room.players.find((p) => p.id !== localPlayerId);
  let outcome: 'win' | 'loss' | 'draw' = 'draw';
  if (opp) {
    if (me.goals !== opp.goals) outcome = me.goals > opp.goals ? 'win' : 'loss';
    else if (me.score !== opp.score) outcome = me.score > opp.score ? 'win' : 'loss';
  }

  const next: DailyState = {
    lastPlayedDate: today,
    streak: nextStreak(state.lastPlayedDate, state.streak, today),
    bestScore: Math.max(state.bestScore, me.score),
    lastScore: me.score,
    lastOutcome: outcome,
    playsTotal: state.playsTotal + 1,
  };
  save(next);
  return next;
}
