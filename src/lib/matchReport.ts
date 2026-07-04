/**
 * Ball Knowledge — full-time Match Report (pure).
 *
 * `summarizeMatch` already gives possession, MOTM, biggest moment and per-side
 * category strengths. This adds the two things a broadcast report still needs:
 *
 *  1. a MINI-GAME-BY-MINI-GAME head-to-head — who took each of the ten formats,
 *     scored from the points earned on that question, and
 *  2. a 0–10 player rating per side, derived from the same match stats.
 *
 * Deterministic and side-effect free: it reads the room's answer log and the
 * summary, so the UI just renders it and a test can pin the maths.
 */

import type { QuestionType, Room } from '../types/game';
import { minuteForQuestion } from './matchTimeline';
import type { MatchSummary, PlayerMatchStats } from './matchStats';

/** Display names for the ten mini-games (the report's row labels). */
export const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
  who_am_i: 'Who Am I?',
  career_path: 'Career Path',
  higher_lower: 'Higher or Lower',
  club_country: 'Club & Country',
  guess_year: 'Guess the Year',
  transfer_fee: 'Transfer Fee',
  pitch_position: 'Pitch Position',
  odd_one_out: 'Odd One Out',
  spot_the_lie: 'Spot the Lie',
  guess_the_number: 'Guess the Number',
};

export type DuelWinner = 'a' | 'b' | 'tie';

export interface MiniGameDuel {
  index: number;
  type: QuestionType;
  label: string;
  minute: number;
  aPoints: number;
  bPoints: number;
  aCorrect: boolean;
  bCorrect: boolean;
  winner: DuelWinner;
}

export interface MatchReport {
  duels: MiniGameDuel[];
  /** playerId → 0–10 rating (one decimal). */
  ratings: Record<string, number>;
  /** playerId → mini-games won outright. */
  duelsWon: Record<string, number>;
}

/** A 0–10 broadcast rating from a player's match stats. */
export function ratePerformance(stats: PlayerMatchStats): number {
  const acc = stats.total > 0 ? stats.accuracy : 0; // 0–100
  const raw =
    3.0 +
    acc * 0.05 + //             accuracy — up to +5.0
    Math.min(stats.goals, 5) * 0.3 + //  goals — up to +1.5
    Math.min(stats.bigChances, 5) * 0.1 + // gilt-edged answers — up to +0.5
    (stats.bestStreak >= 4 ? 0.5 : stats.bestStreak >= 2 ? 0.25 : 0);
  const clamped = Math.max(3, Math.min(10, raw));
  return Math.round(clamped * 10) / 10;
}

/** Build the mini-game head-to-head + ratings for a finished room. */
export function buildMatchReport(room: Room, summary: MatchSummary): MatchReport {
  const [a, b] = room.players;
  const total = room.selectedQuestions.length;

  const duels: MiniGameDuel[] = room.selectedQuestions.map((q, i) => {
    const answers = room.answers[q.id] ?? [];
    const ansA = a ? answers.find((x) => x.playerId === a.id) : undefined;
    const ansB = b ? answers.find((x) => x.playerId === b.id) : undefined;
    const aPoints = ansA?.pointsEarned ?? 0;
    const bPoints = ansB?.pointsEarned ?? 0;
    const winner: DuelWinner = aPoints > bPoints ? 'a' : bPoints > aPoints ? 'b' : 'tie';
    return {
      index: i,
      type: q.type,
      label: QUESTION_TYPE_LABEL[q.type] ?? q.type,
      minute: minuteForQuestion(i, total),
      aPoints,
      bPoints,
      aCorrect: !!ansA?.isCorrect,
      bCorrect: !!ansB?.isCorrect,
      winner,
    };
  });

  const ratings: Record<string, number> = {};
  const duelsWon: Record<string, number> = {};
  for (const p of room.players) {
    const ps = summary.players[p.id];
    ratings[p.id] = ps ? ratePerformance(ps) : 3;
    duelsWon[p.id] = 0;
  }
  if (a && b) {
    for (const d of duels) {
      if (d.winner === 'a') duelsWon[a.id] += 1;
      else if (d.winner === 'b') duelsWon[b.id] += 1;
    }
  }

  return { duels, ratings, duelsWon };
}
