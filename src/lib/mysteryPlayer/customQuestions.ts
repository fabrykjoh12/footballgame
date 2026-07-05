/**
 * Mystery Player Duel — a personal library of custom (free) questions.
 *
 * Free questions are typed and answered by hand, so anything goes. This lets a
 * player SAVE the ones they like and reuse them across games instead of
 * retyping — plus a set of starter prompts so the feature is useful on day one.
 * List transforms are pure (dedupe/cap/order) and unit-tested; storage is a
 * thin localStorage wrapper on top.
 */

const KEY = 'bk_mystery_customq_v1';
const CAP = 40;
const MAX_LEN = 160;

/** Built-in prompts shown even before the player has saved any of their own. */
export const STARTER_QUESTIONS: readonly string[] = [
  'Did your player play in a Champions League final?',
  'Is your player left-footed?',
  'Did your player ever wear the number 10 shirt?',
  'Has your player scored at a World Cup?',
  'Did your player ever line up alongside Messi?',
  'Did your player captain their national team?',
  'Is your player known as a set-piece specialist?',
  'Did your player play in more than three different countries?',
];

/** Trim, collapse whitespace and cap the length of a question. */
export function normalizeQuestion(text: string): string {
  return text.trim().replace(/\s+/g, ' ').slice(0, MAX_LEN);
}

/** Add `text` to the front of `list` (case-insensitive dedupe, capped). */
export function addToList(list: readonly string[], text: string): string[] {
  const q = normalizeQuestion(text);
  if (!q) return [...list];
  const lower = q.toLowerCase();
  const without = list.filter((x) => x.toLowerCase() !== lower);
  return [q, ...without].slice(0, CAP);
}

/** Remove `text` (case-insensitive) from `list`. */
export function removeFromList(list: readonly string[], text: string): string[] {
  const lower = normalizeQuestion(text).toLowerCase();
  return list.filter((x) => x.toLowerCase() !== lower);
}

/* ----------------------------- storage ----------------------------- */

export function getCustomQuestions(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === 'string').slice(0, CAP);
  } catch {
    return [];
  }
}

function save(list: string[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, CAP)));
  } catch {
    /* storage full / unavailable — non-fatal */
  }
}

/** Save a question for reuse; returns the updated list. */
export function saveCustomQuestion(text: string): string[] {
  const next = addToList(getCustomQuestions(), text);
  save(next);
  return next;
}

/** Forget a saved question; returns the updated list. */
export function forgetCustomQuestion(text: string): string[] {
  const next = removeFromList(getCustomQuestions(), text);
  save(next);
  return next;
}
