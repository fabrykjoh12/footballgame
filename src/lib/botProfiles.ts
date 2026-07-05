/**
 * Ball Knowledge — CPU rival personalities (pure).
 *
 * A bot that's just "difficulty% accurate on everything" feels like a dice roll.
 * A rival with a football brain — strong on transfers, weak on tactics, quick
 * but rash — feels human and gives the player something to read and exploit.
 *
 * Each profile nudges the base (difficulty-driven) accuracy up on its strong
 * mini-games and down on its weak ones, and thinks faster or slower. It's all
 * cosmetic-adjacent: the human still answers for themselves, and scoring is
 * unchanged — only how the CPU plays shifts. `profileForName` maps a rival name
 * to a stable personality so a given club always plays the same way.
 */

import type { QuestionType } from '../types/game';

export interface BotProfile {
  id: string;
  /** Persona name shown pre-match, e.g. "The Historian". */
  persona: string;
  /** One-line character read. */
  tagline: string;
  /** Mini-games this rival is strong at (accuracy up). */
  strong: QuestionType[];
  /** Mini-games this rival is weak at (accuracy down). */
  weak: QuestionType[];
  /** Overall accuracy nudge on every question (rewards/penalises consistency). */
  bias: number;
  /** Think-time multiplier: <1 quicker, >1 more deliberate. */
  pace: number;
}

/** Accuracy added on a strong mini-game / removed on a weak one. */
export const STRONG_BONUS = 0.16;
export const WEAK_PENALTY = 0.2;
const MIN_ACCURACY = 0.08;
const MAX_ACCURACY = 0.95;

export const BOT_PROFILES: BotProfile[] = [
  {
    id: 'historian',
    persona: 'The Historian',
    tagline: 'Lives in the archives — eras and old icons, less sure on modern money.',
    strong: ['guess_year', 'who_am_i'],
    weak: ['transfer_fee'],
    bias: 0,
    pace: 1.15,
  },
  {
    id: 'transfer_guru',
    persona: 'The Transfer Guru',
    tagline: 'Knows every fee and move — reads the market before anyone.',
    strong: ['transfer_fee', 'career_path'],
    weak: ['pitch_position'],
    bias: 0,
    pace: 0.85,
  },
  {
    id: 'tactician',
    persona: 'The Tactician',
    tagline: 'A coach at heart — positions and patterns, shaky on hard numbers.',
    strong: ['pitch_position', 'odd_one_out'],
    weak: ['guess_the_number'],
    bias: 0.02,
    pace: 1.1,
  },
  {
    id: 'glory_hunter',
    persona: 'The Glory Hunter',
    tagline: 'All about the superstars — quick to buzz, but rash on the details.',
    strong: ['who_am_i', 'club_country'],
    weak: ['guess_the_number', 'guess_year'],
    bias: -0.03,
    pace: 0.7,
  },
  {
    id: 'academy_scout',
    persona: 'The Academy Scout',
    tagline: 'Tracks journeys and prospects — career paths are home turf.',
    strong: ['career_path', 'higher_lower'],
    weak: ['guess_year'],
    bias: 0.01,
    pace: 1.0,
  },
  {
    id: 'number_cruncher',
    persona: 'The Number Cruncher',
    tagline: 'Slow, deliberate, data-driven — takes the stats to the last decimal.',
    strong: ['guess_the_number', 'higher_lower'],
    weak: ['spot_the_lie'],
    bias: 0.03,
    pace: 1.25,
  },
  {
    id: 'pundit',
    persona: 'The Pundit',
    tagline: 'Never short of an opinion — sniffs out a lie, waves away transfer talk.',
    strong: ['spot_the_lie', 'club_country'],
    weak: ['transfer_fee'],
    bias: 0,
    pace: 0.95,
  },
];

/** Small stable string hash (djb2) for deterministic name → profile mapping. */
function hash(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  return h;
}

/** The rival personality for a given opponent/club name — stable per name. */
export function profileForName(name: string): BotProfile {
  const key = (name || '').trim().toLowerCase();
  const idx = hash(key || 'cpu') % BOT_PROFILES.length;
  return BOT_PROFILES[idx];
}

/** Base difficulty accuracy adjusted by this rival's strengths and weaknesses. */
export function botAccuracyFor(base: number, profile: BotProfile, type: QuestionType): number {
  let acc = base + profile.bias;
  if (profile.strong.includes(type)) acc += STRONG_BONUS;
  else if (profile.weak.includes(type)) acc -= WEAK_PENALTY;
  return Math.max(MIN_ACCURACY, Math.min(MAX_ACCURACY, acc));
}
