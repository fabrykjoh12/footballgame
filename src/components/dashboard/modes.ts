/**
 * Central game-mode catalogue — shared by the sidebar and the home dashboard so
 * icons, labels, and accent colours stay consistent in one place.
 */
import {
  Search,
  UserSearch,
  Link2,
  CalendarDays,
  ScanSearch,
  Compass,
  Cake,
  Briefcase,
  Zap,
  Shield,
  Trophy,
  type LucideIcon,
} from 'lucide-react';
import type { View } from '../../lib/viewRoute';

export type ModeKind = 'Versus' | 'Solo' | 'Daily' | 'Cup';

export interface ModeMeta {
  view: View;
  label: string;
  sub: string;
  kind: ModeKind;
  icon: LucideIcon;
  accent: string; // hex — the mode's identity colour
}

export const VERSUS_MODES: ModeMeta[] = [
  { view: 'scout', label: 'The Scout', sub: 'Deduce the secret scouting rule', kind: 'Versus', icon: Search, accent: '#8B5CF6' },
  { view: 'mystery', label: 'Mystery Duel', sub: 'Football Guess Who, 1v1', kind: 'Versus', icon: UserSearch, accent: '#3B82F6' },
];

export const DAILY_MODES: ModeMeta[] = [
  { view: 'connectionsDaily', label: 'Daily Connections', sub: 'One club-pair puzzle a day', kind: 'Daily', icon: CalendarDays, accent: '#F5C542' },
  { view: 'scoutDaily', label: 'Daily Scout', sub: "Crack today's rule in fewest probes", kind: 'Daily', icon: ScanSearch, accent: '#2ED573' },
];

export const SOLO_MODES: ModeMeta[] = [
  { view: 'connections', label: 'Connections', sub: 'Name a player for both clubs', kind: 'Solo', icon: Link2, accent: '#2ED573' },
  { view: 'careerPath', label: 'Career Path', sub: 'Guess the player from their clubs', kind: 'Solo', icon: Compass, accent: '#EC4899' },
  { view: 'olderYounger', label: 'Older or Younger?', sub: 'Birth-year higher or lower', kind: 'Solo', icon: Cake, accent: '#F97316' },
  { view: 'managers', label: 'Managers', sub: 'Name a manager of both clubs', kind: 'Solo', icon: Briefcase, accent: '#8B5CF6' },
  { view: 'modes', label: 'Arcade', sub: 'Survival · Time Attack · Gauntlet', kind: 'Solo', icon: Zap, accent: '#06B6D4' },
];

export const COMPETE_MODES: ModeMeta[] = [
  { view: 'career', label: 'Career', sub: 'Climb the league pyramid', kind: 'Cup', icon: Shield, accent: '#3B82F6' },
  { view: 'cup', label: 'Cup Runs', sub: 'Knockout tournaments', kind: 'Cup', icon: Trophy, accent: '#F5C542' },
];
