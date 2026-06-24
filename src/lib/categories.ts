import type { Category } from '../types/game';

/** Selectable topics for the lobby filter (soft preference; see questionPicker). */
export const CATEGORY_OPTIONS: { id: Category; label: string }[] = [
  { id: 'players', label: 'Players' },
  { id: 'clubs', label: 'Clubs' },
  { id: 'countries', label: 'Countries' },
  { id: 'leagues', label: 'Leagues' },
  { id: 'champions_league', label: 'Champions League' },
  { id: 'world_cup', label: 'World Cup' },
  { id: 'transfers', label: 'Transfers' },
  { id: 'history', label: 'History' },
];
