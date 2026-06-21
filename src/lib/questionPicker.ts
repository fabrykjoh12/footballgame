/**
 * Builds the question set for a match: enforces the type distribution
 * (3 who-am-i, 3 career-path, 2 higher-lower, 2 club-country for a
 * 10-question game), filters by the mode's difficulty tiers, and shuffles.
 *
 * The host runs this once and shares `selectedQuestions` through the room so
 * both players always see the exact same questions in the same order.
 */

import type {
  Difficulty,
  MatchSettings,
  Question,
  QuestionType,
} from '../types/game';
import { QUESTIONS } from '../data/questions';
import { difficultiesForMode, MATCH_TYPE_DISTRIBUTION } from './matchModes';

/** Fisher–Yates shuffle (returns a new array). */
export function shuffle<T>(arr: readonly T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pickOfType(
  pool: Question[],
  type: QuestionType,
  count: number,
  allowed: Difficulty[],
): Question[] {
  const byType = pool.filter((q) => q.type === type);
  const inTier = shuffle(byType.filter((q) => allowed.includes(q.difficulty)));

  const chosen = inTier.slice(0, count);
  // Fallback: if a tier is short on a given type, top up from any difficulty
  // of that type so a match always has a full slate of questions.
  if (chosen.length < count) {
    const remaining = shuffle(byType.filter((q) => !chosen.includes(q)));
    chosen.push(...remaining.slice(0, count - chosen.length));
  }
  return chosen;
}

/**
 * Scale the base distribution to the requested questionCount, keeping the
 * 3:3:2:2 ratio as closely as possible (defaults to exactly that for 10).
 */
function distributionFor(count: number): Record<QuestionType, number> {
  const base = MATCH_TYPE_DISTRIBUTION;
  const baseTotal =
    base.who_am_i + base.career_path + base.higher_lower + base.club_country;
  if (count === baseTotal) return { ...base };

  const scale = count / baseTotal;
  const dist: Record<QuestionType, number> = {
    who_am_i: Math.round(base.who_am_i * scale),
    career_path: Math.round(base.career_path * scale),
    higher_lower: Math.round(base.higher_lower * scale),
    club_country: Math.round(base.club_country * scale),
  };
  // Correct any rounding drift against the requested count.
  let total = dist.who_am_i + dist.career_path + dist.higher_lower + dist.club_country;
  const order: QuestionType[] = ['who_am_i', 'career_path', 'higher_lower', 'club_country'];
  let idx = 0;
  while (total !== count) {
    const key = order[idx % order.length];
    if (total < count) {
      dist[key]++;
      total++;
    } else if (dist[key] > 0) {
      dist[key]--;
      total--;
    }
    idx++;
  }
  return dist;
}

export function pickMatchQuestions(
  settings: MatchSettings,
  pool: Question[] = QUESTIONS,
): Question[] {
  const allowed = difficultiesForMode(settings.mode);
  const dist = distributionFor(settings.questionCount);

  const selected: Question[] = [
    ...pickOfType(pool, 'who_am_i', dist.who_am_i, allowed),
    ...pickOfType(pool, 'career_path', dist.career_path, allowed),
    ...pickOfType(pool, 'higher_lower', dist.higher_lower, allowed),
    ...pickOfType(pool, 'club_country', dist.club_country, allowed),
  ];

  // Shuffle the final order so mini-games are interleaved.
  return shuffle(selected);
}
