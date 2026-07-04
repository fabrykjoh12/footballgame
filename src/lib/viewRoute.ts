/**
 * View ↔ URL-hash mapping for the top-level singleplayer screens.
 *
 * Views used to be plain React state, so the browser Back button exited the
 * site instead of returning home, and no mode was linkable. Syncing the view
 * to `location.hash` (`#career`, `#daily-connections`, …) fixes both with no
 * router dependency — hash navigation also survives GitHub Pages' relative
 * base path untouched.
 *
 * The live-match flow stays state-driven (room status outranks the view in
 * `App.tsx`), and the `?room=` join param is a search param, unaffected here.
 */

export type View =
  | 'home'
  | 'career'
  | 'modes'
  | 'cup'
  | 'connections'
  | 'connectionsDaily'
  | 'mystery'
  | 'olderYounger'
  | 'careerPath'
  | 'managers'
  | 'scout'
  | 'scoutDaily';

/** Kebab-case slugs so shared links read cleanly. Home is the bare URL. */
const VIEW_TO_SLUG: Record<View, string> = {
  home: '',
  career: 'career',
  modes: 'modes',
  cup: 'cup',
  connections: 'connections',
  connectionsDaily: 'daily-connections',
  mystery: 'mystery',
  olderYounger: 'older-younger',
  careerPath: 'career-path',
  managers: 'managers',
  scout: 'scout',
  scoutDaily: 'daily-scout',
};

const SLUG_TO_VIEW: Record<string, View> = Object.fromEntries(
  (Object.entries(VIEW_TO_SLUG) as Array<[View, string]>)
    .filter(([, slug]) => slug !== '')
    .map(([view, slug]) => [slug, view]),
) as Record<string, View>;

/** The `location.hash` value for a view ('' for home — the bare URL). */
export function viewToHash(view: View): string {
  const slug = VIEW_TO_SLUG[view];
  return slug ? `#${slug}` : '';
}

/** Parse a `location.hash` (with or without '#'); unknown or empty → home. */
export function hashToView(hash: string): View {
  const slug = hash.replace(/^#/, '').trim();
  return SLUG_TO_VIEW[slug] ?? 'home';
}
