/**
 * Match mode definitions. The host picks one of these in the lobby; it
 * controls which difficulty tiers are eligible when picking questions.
 */

import type { Difficulty, MatchMode, MatchModeConfig, MatchSettings } from '../types/game';

export const DEFAULT_QUESTION_COUNT = 10;
export const DEFAULT_QUESTION_DURATION_MS = 15_000;

/** Question-type distribution for a 10-question match. */
export const MATCH_TYPE_DISTRIBUTION = {
  who_am_i: 3,
  career_path: 2,
  higher_lower: 2,
  club_country: 1,
  guess_year: 1,
  transfer_fee: 1,
} as const;

export const MATCH_MODES: Record<MatchMode, MatchModeConfig> = {
  casual: {
    id: 'casual',
    label: 'Casual Match',
    description: 'Easy + Medium. Friendly kickabout for everyone.',
    difficulties: ['easy', 'medium'],
  },
  serious: {
    id: 'serious',
    label: 'Serious Ball Knowledge',
    description: 'Medium + Hard. For the group-chat football brains.',
    difficulties: ['medium', 'hard'],
  },
  nightmare: {
    id: 'nightmare',
    label: 'Nightmare Mode',
    description: 'Hard + Nightmare. Only true scholars survive.',
    difficulties: ['hard', 'nightmare'],
  },
};

export const MATCH_MODE_LIST: MatchModeConfig[] = [
  MATCH_MODES.casual,
  MATCH_MODES.serious,
  MATCH_MODES.nightmare,
];

export function difficultiesForMode(mode: MatchMode): Difficulty[] {
  return MATCH_MODES[mode].difficulties;
}

export function defaultSettings(mode: MatchMode = 'casual'): MatchSettings {
  return {
    mode,
    questionCount: DEFAULT_QUESTION_COUNT,
    questionDurationMs: DEFAULT_QUESTION_DURATION_MS,
  };
}
