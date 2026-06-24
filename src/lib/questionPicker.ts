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

/**
 * Randomizes where the correct answer sits, so it isn't always option "A".
 * - Multiple-choice: shuffle the 4 options.
 * - Higher/Lower: randomly swap the two sides.
 * The `correctAnswer` string is untouched, so scoring is unaffected. Done once
 * by the host at pick time and broadcast, so both players see one layout.
 */
export function randomizeAnswerOrder(q: Question): Question {
  if (q.type === 'higher_lower') {
    return Math.random() < 0.5
      ? { ...q, leftOption: q.rightOption, rightOption: q.leftOption }
      : q;
  }
  // Years read best chronologically; the correct slot still varies by content.
  if (q.type === 'guess_year') {
    return { ...q, options: [...q.options].sort((a, b) => Number(a) - Number(b)) };
  }
  return { ...q, options: shuffle(q.options) };
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
 * ratio as close as possible (defaults to the exact base mix for 10).
 * Generic over the configured types, so adding a mini-game just works.
 */
function distributionFor(count: number): Record<QuestionType, number> {
  const base = MATCH_TYPE_DISTRIBUTION;
  const keys = Object.keys(base) as QuestionType[];
  const baseTotal = keys.reduce((sum, k) => sum + base[k], 0);
  if (count === baseTotal) return { ...base };

  const scale = count / baseTotal;
  const dist = {} as Record<QuestionType, number>;
  for (const k of keys) dist[k] = Math.round(base[k] * scale);

  // Correct any rounding drift against the requested count.
  let total = keys.reduce((sum, k) => sum + dist[k], 0);
  let idx = 0;
  while (total !== count) {
    const key = keys[idx % keys.length];
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
    ...pickOfType(pool, 'guess_year', dist.guess_year, allowed),
  ];

  // Shuffle the final order so mini-games are interleaved, then randomize each
  // question's answer positions so the correct answer isn't always in slot A.
  return shuffle(selected).map(randomizeAnswerOrder);
}
