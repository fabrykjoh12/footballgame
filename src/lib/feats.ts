/**
 * Feats — one-off match accomplishments (a perfect match, a comeback, a
 * stoppage-time winner…) that aren't captured by the running profile totals.
 * Detected purely from a finished room, then merged into a local set so the
 * achievement layer can unlock badges for them. Idempotent per match sig.
 */

import type { Room } from '../types/game';
import { summarizeMatch } from './matchStats';
import { notifyProgressChanged } from './progress';

const KEY = 'bk_feats_v1';

export type FeatId =
  | 'perfect_match'
  | 'comeback'
  | 'clean_sheet'
  | 'five_star'
  | 'hat_trick_answers'
  | 'win_on_points'
  | 'nightmare_win'
  | 'stoppage_winner';

interface FeatStore {
  ids: FeatId[];
  lastSig?: string;
}

function matchSig(room: Room): string {
  return `${room.createdAt}:${room.selectedQuestions.map((q) => q.id).join(',')}`;
}

/** Pure: which feats a finished match earns for the local player. */
export function detectMatchFeats(room: Room, localPlayerId: string): FeatId[] {
  const me = room.players.find((p) => p.id === localPlayerId);
  const opp = room.players.find((p) => p.id !== localPlayerId);
  if (!me) return [];

  let won = false;
  let onPoints = false;
  if (opp) {
    if (me.goals !== opp.goals) won = me.goals > opp.goals;
    else if (me.score !== opp.score) {
      won = me.score > opp.score;
      onPoints = won;
    }
  }

  const total = room.selectedQuestions.length;
  const feats: FeatId[] = [];

  if (total > 0 && me.correctAnswers === total) feats.push('perfect_match');
  if (me.bestStreak >= 3) feats.push('hat_trick_answers');
  if (won && opp && opp.goals === 0) feats.push('clean_sheet');
  if (won && me.goals >= 5) feats.push('five_star');
  if (won && onPoints) feats.push('win_on_points');
  if (won && room.settings.mode === 'nightmare') feats.push('nightmare_win');
  if (won && (room.stoppageRound ?? 0) > 0) feats.push('stoppage_winner');
  if (won) {
    const meStats = summarizeMatch(room).players[me.id];
    if ((meStats?.maxDeficit ?? 0) >= 2) feats.push('comeback');
  }

  return feats;
}

export function getFeats(): Set<FeatId> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as FeatStore;
    return new Set(parsed.ids ?? []);
  } catch {
    return new Set();
  }
}

/**
 * Merge a finished match's feats into the local set. Idempotent per match sig.
 * Returns the full current set of earned feats.
 */
export function recordMatchFeats(room: Room, localPlayerId: string): Set<FeatId> {
  let store: FeatStore = { ids: [] };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) store = JSON.parse(raw) as FeatStore;
  } catch {
    /* ignore */
  }
  const sig = matchSig(room);
  if (store.lastSig === sig) return new Set(store.ids ?? []);

  const merged = new Set<FeatId>(store.ids ?? []);
  for (const f of detectMatchFeats(room, localPlayerId)) merged.add(f);

  const next: FeatStore = { ids: [...merged], lastSig: sig };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
    notifyProgressChanged();
  } catch {
    /* storage unavailable */
  }
  return merged;
}
