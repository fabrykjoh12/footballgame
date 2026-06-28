/**
 * Persistent local profile — lifetime stats kept in localStorage and updated
 * once per finished match. Entirely client-side (no backend), so it works in
 * demo and multiplayer alike.
 */

import type { Room } from '../types/game';
import { getPlayerTitle } from './playerTitle';
import { notifyProgressChanged } from './progress';
import { recordSeenQuestions } from './questionHistory';
import { recordHeadToHead } from './headToHead';
import { recordOpponent } from './recentOpponents';

const KEY = 'bk_profile_v1';

export interface ProfileStats {
  matchesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  totalCorrect: number;
  totalQuestions: number;
  bestStreak: number;
  goalsScored: number;
  fastestAnswerMs: number | null;
  lastTitle?: string;
  /** Guards against double-counting the same finished match. */
  lastMatchSig?: string;
}

const EMPTY: ProfileStats = {
  matchesPlayed: 0,
  wins: 0,
  losses: 0,
  draws: 0,
  totalCorrect: 0,
  totalQuestions: 0,
  bestStreak: 0,
  goalsScored: 0,
  fastestAnswerMs: null,
};

export function getProfileStats(): ProfileStats {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...EMPTY, ...(JSON.parse(raw) as ProfileStats) } : { ...EMPTY };
  } catch {
    return { ...EMPTY };
  }
}

function save(stats: ProfileStats): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(stats));
    notifyProgressChanged();
  } catch {
    /* storage unavailable / full */
  }
}

export function resetProfileStats(): ProfileStats {
  save({ ...EMPTY });
  return { ...EMPTY };
}

function matchSignature(room: Room): string {
  return `${room.createdAt}:${room.selectedQuestions.map((q) => q.id).join(',')}`;
}

/** Merge a finished match's result for the local player. Idempotent. */
export function recordMatchResult(room: Room, localPlayerId: string): ProfileStats {
  const prev = getProfileStats();
  const me = room.players.find((p) => p.id === localPlayerId);
  if (!me) return prev;

  const sig = matchSignature(room);
  if (prev.lastMatchSig === sig) return prev; // already counted

  // Remember the questions just played so the picker can keep matches fresh.
  recordSeenQuestions(room.selectedQuestions.map((q) => q.id));
  // Track the rivalry record against this opponent.
  recordHeadToHead(room, localPlayerId);

  const opp = room.players.find((p) => p.id !== localPlayerId);
  // Remember real (non-bot) opponents so they can be added / rematched.
  if (opp && !opp.isBot && opp.name.trim()) recordOpponent(opp.name);
  let outcome: 'win' | 'loss' | 'draw' = 'draw';
  if (opp) {
    if (me.goals !== opp.goals) outcome = me.goals > opp.goals ? 'win' : 'loss';
    else if (me.score !== opp.score) outcome = me.score > opp.score ? 'win' : 'loss';
  }

  const fastest =
    me.fastestAnswerMs == null
      ? prev.fastestAnswerMs
      : prev.fastestAnswerMs == null
        ? me.fastestAnswerMs
        : Math.min(prev.fastestAnswerMs, me.fastestAnswerMs);

  const next: ProfileStats = {
    matchesPlayed: prev.matchesPlayed + 1,
    wins: prev.wins + (outcome === 'win' ? 1 : 0),
    losses: prev.losses + (outcome === 'loss' ? 1 : 0),
    draws: prev.draws + (outcome === 'draw' ? 1 : 0),
    totalCorrect: prev.totalCorrect + me.correctAnswers,
    totalQuestions: prev.totalQuestions + room.selectedQuestions.length,
    bestStreak: Math.max(prev.bestStreak, me.bestStreak),
    goalsScored: prev.goalsScored + me.goals,
    fastestAnswerMs: fastest,
    lastTitle: getPlayerTitle({
      correctAnswers: me.correctAnswers,
      totalQuestions: room.selectedQuestions.length,
      bestStreak: me.bestStreak,
    }).title,
    lastMatchSig: sig,
  };
  save(next);
  return next;
}

export function winRate(s: ProfileStats): number {
  return s.matchesPlayed > 0 ? Math.round((s.wins / s.matchesPlayed) * 100) : 0;
}

export function lifetimeAccuracy(s: ProfileStats): number {
  return s.totalQuestions > 0
    ? Math.round((s.totalCorrect / s.totalQuestions) * 100)
    : 0;
}
