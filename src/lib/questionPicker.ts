/**
 * Builds the question set for a match: enforces the type distribution
 * (3 who-am-i, 3 career-path, 2 higher-lower, 2 club-country for a
 * 10-question game), filters by the mode's difficulty tiers, and shuffles.
 *
 * The host runs this once and shares `selectedQuestions` through the room so
 * both players always see the exact same questions in the same order.
 */

import type {
  Category,
  Difficulty,
  MatchSettings,
  Question,
  QuestionType,
} from '../types/game';
import { QUESTIONS } from '../data/questions';
import { difficultiesForMode, MATCH_TYPE_DISTRIBUTION } from './matchModes';
import { mulberry32, type Rng } from './seededRandom';

/** Fisher–Yates shuffle (returns a new array). */
export function shuffle<T>(arr: readonly T[], rng: Rng = Math.random): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
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
export function randomizeAnswerOrder(q: Question, rng: Rng = Math.random): Question {
  if (q.type === 'higher_lower') {
    return rng() < 0.5
      ? { ...q, leftOption: q.rightOption, rightOption: q.leftOption }
      : q;
  }
  // Years read best chronologically; the correct slot still varies by content.
  if (q.type === 'guess_year') {
    return { ...q, options: [...q.options].sort((a, b) => Number(a) - Number(b)) };
  }
  // Pitch zones are spatial (GK→Forward) — keep their fixed order.
  if (q.type === 'pitch_position') return q;
  return { ...q, options: shuffle(q.options, rng) };
}

function pickOfType(
  pool: Question[],
  type: QuestionType,
  count: number,
  allowed: Difficulty[],
  rng: Rng,
  categories?: Category[],
): Question[] {
  const byType = pool.filter((q) => q.type === type);
  const tier = byType.filter((q) => allowed.includes(q.difficulty));

  // Prefer the selected topics within the mode's difficulty tier.
  const preferred =
    categories && categories.length
      ? tier.filter((q) => categories.includes(q.category))
      : tier;

  const chosen = shuffle(preferred, rng).slice(0, count);

  // Top up from the rest of the tier (relax topic, keep the mode's difficulty).
  if (chosen.length < count) {
    const more = shuffle(tier.filter((q) => !chosen.includes(q)), rng);
    chosen.push(...more.slice(0, count - chosen.length));
  }
  // Last resort: any difficulty of this type, so a match is always full.
  if (chosen.length < count) {
    const more = shuffle(byType.filter((q) => !chosen.includes(q)), rng);
    chosen.push(...more.slice(0, count - chosen.length));
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
  // A seed makes the whole pick deterministic (Daily Challenge); otherwise random.
  const rng: Rng = settings.seed != null ? mulberry32(settings.seed) : Math.random;
  const allowed = difficultiesForMode(settings.mode);
  const dist = distributionFor(settings.questionCount);

  const cats = settings.categories;
  const selected: Question[] = [
    ...pickOfType(pool, 'who_am_i', dist.who_am_i, allowed, rng, cats),
    ...pickOfType(pool, 'career_path', dist.career_path, allowed, rng, cats),
    ...pickOfType(pool, 'higher_lower', dist.higher_lower, allowed, rng, cats),
    ...pickOfType(pool, 'club_country', dist.club_country, allowed, rng, cats),
    ...pickOfType(pool, 'guess_year', dist.guess_year, allowed, rng, cats),
    ...pickOfType(pool, 'transfer_fee', dist.transfer_fee, allowed, rng, cats),
    ...pickOfType(pool, 'pitch_position', dist.pitch_position, allowed, rng, cats),
    ...pickOfType(pool, 'odd_one_out', dist.odd_one_out, allowed, rng, cats),
  ];

  // Shuffle the final order so mini-games are interleaved, then randomize each
  // question's answer positions so the correct answer isn't always in slot A.
  return shuffle(selected, rng).map((q) => randomizeAnswerOrder(q, rng));
}

/**
 * Reserve questions for sudden-death stoppage time. Prefers quick, single-answer
 * types (skips clue-based who_am_i) and excludes anything already in the match.
 * Deterministic when a seed is set (offset so it differs from the main pick).
 */
export function pickTiebreakers(
  settings: MatchSettings,
  used: Question[],
  count = 5,
  pool: Question[] = QUESTIONS,
): Question[] {
  const rng: Rng = settings.seed != null ? mulberry32((settings.seed ^ 0x5eed) >>> 0) : Math.random;
  const allowed = difficultiesForMode(settings.mode);
  const usedIds = new Set(used.map((q) => q.id));
  const candidates = pool.filter(
    (q) => !usedIds.has(q.id) && q.type !== 'who_am_i' && allowed.includes(q.difficulty),
  );
  return shuffle(candidates, rng)
    .slice(0, count)
    .map((q) => randomizeAnswerOrder(q, rng));
}
