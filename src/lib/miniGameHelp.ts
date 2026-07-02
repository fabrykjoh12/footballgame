/**
 * Mini-game teach-ins — a one-line rule + tiny example for each of the ten
 * question types, shown the FIRST time a player ever meets that type (and on
 * demand via the "?" in the question header).
 *
 * The ten formats were previously taught only by failing them; this closes the
 * biggest new-player comprehension gap without adding an onboarding wall. A
 * coverage test cross-checks the catalogue against `scoring.BASE_POINTS`, so a
 * new question type cannot ship without help text.
 *
 * First-encounter tracking is per-device (localStorage) with an in-session
 * claim cache so React StrictMode's double renders and re-mounts can't flicker
 * or re-consume the flag: the first unseen question of a type "claims" the
 * teach-in for its own question id, and every later render (or question) gets
 * a stable answer.
 */

import type { QuestionType } from '../types/game';

export interface MiniGameHelp {
  /** One short sentence: how this mini-game works. */
  rule: string;
  /** A tiny concrete example / tip that makes the rule click. */
  example: string;
}

export const MINI_GAME_HELP: Record<QuestionType, MiniGameHelp> = {
  who_am_i: {
    rule: 'Clues reveal over time, vague → specific. Guess the player early for more points.',
    example: 'Clue 1 fits many players — clue 3 names clubs. Buzz as soon as you’re sure.',
  },
  career_path: {
    rule: 'Read the club chain and name the player who made exactly those moves.',
    example: 'Zaragoza → Valencia → Barcelona → Atlético? That’s David Villa.',
  },
  higher_lower: {
    rule: 'Two options, one stat — pick the side with the HIGHER number.',
    example: 'More European Cups: Milan or Ajax? Back the bigger haul.',
  },
  club_country: {
    rule: 'Straight football trivia: one correct option out of four.',
    example: 'Answering faster earns a speed bonus — but a wrong answer scores zero.',
  },
  guess_year: {
    rule: 'Pick the year it happened — the four options are sorted oldest to newest.',
    example: 'Think era first (90s? 2010s?), then split the difference.',
  },
  transfer_fee: {
    rule: 'Pick roughly what the transfer cost — one fee is right, three are decoys.',
    example: 'Anchor on the era: world records were ~€90m in 2013, €200m+ after Neymar.',
  },
  pitch_position: {
    rule: 'Place the player on the pitch — pick the line he actually played in.',
    example: 'Go with his main role: wing-backs are defenders, wingers are forwards.',
  },
  odd_one_out: {
    rule: 'Three options share something — pick the one that doesn’t belong.',
    example: 'Three Madrid clubs and Valencia? Valencia is your answer.',
  },
  spot_the_lie: {
    rule: 'Three statements are true — find the FALSE one.',
    example: 'The lie usually twists one detail: a year, a club, a number.',
  },
  guess_the_number: {
    rule: 'Slide to your best guess — the closer you land, the more points you keep.',
    example: 'No exact answer needed: 10% off still pays ~90% of the pot.',
  },
};

/* ------------------------------------------------------------------ */
/* First-encounter tracking (per-device)                                */
/* ------------------------------------------------------------------ */

const KEY = 'bk_help_seen_v1';

function readSeen(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

function writeSeen(list: string[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* storage unavailable */
  }
}

/** type → the question id that claimed its teach-in this session ('' = none). */
const sessionClaims = new Map<string, string>();

/** Test hook: forget in-session claims (storage is untouched). */
export function resetFirstEncounterSession(): void {
  sessionClaims.clear();
}

/**
 * Whether `token` (a question id) is THE first-ever encounter of `type` on this
 * device. The first call for an unseen type claims it and persists the seen
 * flag; repeat calls with the same token stay true (render-stable), any other
 * token — including later in the same session — is false.
 */
export function isFirstEncounter(type: QuestionType, token: string): boolean {
  const claimed = sessionClaims.get(type);
  if (claimed !== undefined) return claimed === token;

  const seen = readSeen();
  if (seen.includes(type)) {
    sessionClaims.set(type, '');
    return false;
  }
  writeSeen([...seen, type]);
  sessionClaims.set(type, token);
  return true;
}
