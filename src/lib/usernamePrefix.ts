/**
 * Prefix-range bounds for a Firestore username search.
 *
 * A Firestore prefix query is a range: `>= term` AND `<= term + <high sentinel>`.
 * The sentinel is U+F8FF (a Private-Use-Area code point that sorts after every
 * normal character), so the range matches every string that STARTS WITH `term`.
 * Using the bare `term` as the upper bound (a bug this replaces) collapses the
 * range to an exact match, so search never returns prefixes.
 *
 * Extracted as its own tiny pure module because `firebaseBackend.ts` statically
 * imports the Firebase SDK and so can't be unit-tested; this can.
 */

/**
 * High sentinel that sorts after any ordinary character (U+F8FF).
 * Built from a code point rather than a literal glyph so it can't be silently
 * dropped by an editor or copy-paste — which is exactly how the original search
 * bug arose (the sentinel went missing, collapsing the range to an exact match).
 */
export const PREFIX_HIGH_SENTINEL = String.fromCharCode(0xf8ff);

export interface PrefixRange {
  /** Inclusive lower bound (the normalized term). */
  start: string;
  /** Inclusive upper bound (term + high sentinel). */
  end: string;
}

/** Lower-case + trim a term and return its inclusive prefix range. */
export function usernamePrefixRange(term: string): PrefixRange {
  const start = term.toLowerCase().trim();
  return { start, end: start + PREFIX_HIGH_SENTINEL };
}
