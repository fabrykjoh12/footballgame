/**
 * Ball Knowledge — post-match summary (pure).
 *
 * Reconstructs a satisfying, shareable picture of a finished match from the
 * room's answer log: possession-style "knowledge share", shots / chances /
 * goals, best & weakest category per side, the single biggest moment, the Man
 * of the Match, and a replayable timeline. All derived deterministically from
 * `room.answers` + `room.selectedQuestions`, so it's unit-testable and the UI
 * just renders it.
 */

import type { Category, Player, Room } from '../types/game';
import { calculateGoalsFromPoints, accuracyPercent } from './scoring';
import { BIG_CHANCE_FRACTION } from './attackFraming';
import { buildQuestionMarks, minuteForQuestion, type TimelineMark } from './matchTimeline';

export interface CategoryRecord {
  category: Category;
  correct: number;
  total: number;
  /** 0–100. */
  accuracy: number;
}

export interface PlayerMatchStats {
  playerId: string;
  goals: number;
  points: number;
  correct: number;
  total: number;
  /** 0–100. */
  accuracy: number;
  bestStreak: number;
  fastestMs: number | null;
  /** Share of the two sides' combined points, 0–100 (possession-style). */
  knowledgeShare: number;
  /** Questions the player actually answered (shots). */
  shots: number;
  /** Correct answers (chances created). */
  chances: number;
  /** Fast correct answers (gilt-edged big chances). */
  bigChances: number;
  /** Best-performing category (highest accuracy, min 1 question). */
  bestCategory: CategoryRecord | null;
  /** Weakest category (lowest accuracy, min 1 question). */
  weakestCategory: CategoryRecord | null;
  /** Largest goal deficit faced at any point (for comeback detection). */
  maxDeficit: number;
}

export type MomentKind = 'late_winner' | 'equalizer' | 'goal' | 'big_chance';

export interface BiggestMoment {
  kind: MomentKind;
  minute: number;
  playerId: string;
  label: string;
}

export interface MatchSummary {
  players: Record<string, PlayerMatchStats>;
  /** Man of the Match (best individual performance), or null if no players. */
  motmId: string | null;
  biggest: BiggestMoment | null;
  /** Every notable mark across the match, in order, for a timeline replay. */
  timeline: TimelineMark[];
}

const MOMENT_LABEL: Record<MomentKind, string> = {
  late_winner: 'Late Winner',
  equalizer: 'Equalizer',
  goal: 'Goal',
  big_chance: 'Big Chance',
};

const MOMENT_RANK: Record<MomentKind, number> = {
  late_winner: 4,
  equalizer: 3,
  goal: 2,
  big_chance: 1,
};

const LATE_MINUTE = 80;

function emptyStats(player: Player): PlayerMatchStats {
  return {
    playerId: player.id,
    goals: player.goals,
    points: player.score,
    correct: player.correctAnswers,
    total: 0,
    accuracy: 0,
    bestStreak: player.bestStreak,
    fastestMs: player.fastestAnswerMs,
    knowledgeShare: 0,
    shots: 0,
    chances: 0,
    bigChances: 0,
    bestCategory: null,
    weakestCategory: null,
    maxDeficit: 0,
  };
}

function bestWeakest(
  counts: Map<Category, { correct: number; total: number }>,
): { best: CategoryRecord | null; weakest: CategoryRecord | null } {
  const records: CategoryRecord[] = [];
  for (const [category, { correct, total }] of counts) {
    if (total <= 0) continue;
    records.push({ category, correct, total, accuracy: accuracyPercent(correct, total) });
  }
  if (records.length === 0) return { best: null, weakest: null };

  // Best: highest accuracy, then more correct, then more attempts.
  const best = [...records].sort(
    (x, y) => y.accuracy - x.accuracy || y.correct - x.correct || y.total - x.total,
  )[0];
  // Weakest: lowest accuracy, then more attempts (a sample size that matters).
  const weakest = [...records].sort(
    (x, y) => x.accuracy - y.accuracy || y.total - x.total,
  )[0];
  return { best, weakest };
}

/** Build the full post-match summary from a finished (or in-progress) room. */
export function summarizeMatch(room: Room): MatchSummary {
  const [a, b] = room.players;
  const stats: Record<string, PlayerMatchStats> = {};
  for (const p of room.players) stats[p.id] = emptyStats(p);

  const catCounts = new Map<string, Map<Category, { correct: number; total: number }>>();
  for (const p of room.players) catCounts.set(p.id, new Map());

  const cumulative = new Map<string, number>(); // playerId → running points
  for (const p of room.players) cumulative.set(p.id, 0);
  const prevGoals = new Map<string, number>();
  for (const p of room.players) prevGoals.set(p.id, 0);

  const total = room.selectedQuestions.length;
  const timeline: TimelineMark[] = [];
  let biggest: BiggestMoment | null = null;

  const considerMoment = (m: BiggestMoment) => {
    if (
      !biggest ||
      MOMENT_RANK[m.kind] > MOMENT_RANK[biggest.kind] ||
      (MOMENT_RANK[m.kind] === MOMENT_RANK[biggest.kind] && m.minute >= biggest.minute)
    ) {
      biggest = m;
    }
  };

  room.selectedQuestions.forEach((q, i) => {
    const minute = minuteForQuestion(i, total);
    const answers = room.answers[q.id] ?? [];
    const scoredThis: Record<string, boolean> = {};

    for (const p of room.players) {
      const ps = stats[p.id];
      const ans = answers.find((x) => x.playerId === p.id);
      ps.total += 1;

      const cats = catCounts.get(p.id)!;
      const c = cats.get(q.category) ?? { correct: 0, total: 0 };
      c.total += 1;

      if (ans) {
        const answered = ans.selectedAnswer !== null;
        if (answered) ps.shots += 1;
        if (ans.isCorrect) {
          ps.chances += 1;
          c.correct += 1;
          const frac =
            room.settings.questionDurationMs > 0
              ? Math.max(0, room.settings.questionDurationMs - ans.timeTakenMs) /
                room.settings.questionDurationMs
              : 0;
          if (frac >= BIG_CHANCE_FRACTION) {
            ps.bigChances += 1;
            considerMoment({ kind: 'big_chance', minute, playerId: p.id, label: MOMENT_LABEL.big_chance });
          }
        }

        // Goal reconstruction from the running points total.
        const running = (cumulative.get(p.id) ?? 0) + ans.pointsEarned;
        cumulative.set(p.id, running);
        const goalsNow = calculateGoalsFromPoints(running);
        if (goalsNow > (prevGoals.get(p.id) ?? 0)) scoredThis[p.id] = true;
        prevGoals.set(p.id, goalsNow);
      }
      cats.set(q.category, c);
    }

    // Cross-player drama for this question (needs both sides' goal state).
    if (a && b) {
      const ga = prevGoals.get(a.id) ?? 0;
      const gb = prevGoals.get(b.id) ?? 0;
      const scorer = scoredThis[a.id] ? a.id : scoredThis[b.id] ? b.id : null;
      const onlyOne = !!scoredThis[a.id] !== !!scoredThis[b.id];
      if (scorer && onlyOne) {
        const level = ga === gb;
        if (minute >= LATE_MINUTE && !level) {
          considerMoment({ kind: 'late_winner', minute, playerId: scorer, label: MOMENT_LABEL.late_winner });
        } else if (level) {
          considerMoment({ kind: 'equalizer', minute, playerId: scorer, label: MOMENT_LABEL.equalizer });
        } else {
          considerMoment({ kind: 'goal', minute, playerId: scorer, label: MOMENT_LABEL.goal });
        }
      }
    }

    // Track each side's worst goal deficit so far (for comeback detection).
    if (a && b) {
      const ga = prevGoals.get(a.id) ?? 0;
      const gb = prevGoals.get(b.id) ?? 0;
      stats[a.id].maxDeficit = Math.max(stats[a.id].maxDeficit, gb - ga);
      stats[b.id].maxDeficit = Math.max(stats[b.id].maxDeficit, ga - gb);
    }

    // Timeline marks for replay (reuse the live timeline builder).
    const outcomeFor = (p?: Player) => {
      if (!p) return undefined;
      const ans = answers.find((x) => x.playerId === p.id);
      return {
        scoredGoal: !!scoredThis[p.id],
        isCorrect: !!ans?.isCorrect,
        answered: !!ans && ans.selectedAnswer !== null,
        pointsEarned: ans?.pointsEarned ?? 0,
        streakBonus: 0,
        timeTakenMs: ans?.timeTakenMs ?? room.settings.questionDurationMs,
      };
    };
    timeline.push(
      ...buildQuestionMarks({
        questionId: q.id,
        minute,
        totalTimeMs: room.settings.questionDurationMs,
        home: outcomeFor(a),
        away: outcomeFor(b),
      }),
    );
  });

  // Finalize derived per-player numbers.
  const totalPoints = room.players.reduce((s, p) => s + p.score, 0);
  for (const p of room.players) {
    const ps = stats[p.id];
    ps.accuracy = accuracyPercent(ps.correct, ps.total);
    ps.knowledgeShare = totalPoints > 0 ? Math.round((p.score / totalPoints) * 100) : 50;
    const { best, weakest } = bestWeakest(catCounts.get(p.id)!);
    ps.bestCategory = best;
    ps.weakestCategory = weakest;
  }

  return { players: stats, motmId: manOfTheMatch(room), biggest, timeline };
}

/** Best individual performance: most points, then correct, then fastest. */
export function manOfTheMatch(room: Room): string | null {
  const ranked = [...room.players].sort((x, y) => {
    if (y.score !== x.score) return y.score - x.score;
    if (y.correctAnswers !== x.correctAnswers) return y.correctAnswers - x.correctAnswers;
    const fx = x.fastestAnswerMs ?? Infinity;
    const fy = y.fastestAnswerMs ?? Infinity;
    return fx - fy;
  });
  return ranked[0]?.id ?? null;
}
