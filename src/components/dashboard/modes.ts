/**
 * Central game-mode catalogue — shared by the sidebar and the home dashboard so
 * icons and labels stay consistent in one place.
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
  Waypoints,
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
}

export const VERSUS_MODES: ModeMeta[] = [
  { view: 'rondo', label: 'Rondo', sub: 'Take turns naming players who fit', kind: 'Versus', icon: Waypoints },
  { view: 'scout', label: 'The Scout', sub: 'Deduce the secret scouting rule', kind: 'Versus', icon: Search },
  { view: 'mystery', label: 'Mystery Duel', sub: 'Football Guess Who, 1v1', kind: 'Versus', icon: UserSearch },
];

export const DAILY_MODES: ModeMeta[] = [
  { view: 'connectionsDaily', label: 'Daily Connections', sub: 'One club-pair puzzle a day', kind: 'Daily', icon: CalendarDays },
  { view: 'scoutDaily', label: 'Daily Scout', sub: "Crack today's rule in fewest probes", kind: 'Daily', icon: ScanSearch },
  { view: 'rondoDaily', label: 'Daily Rondo', sub: 'Endurance: name as many as you can', kind: 'Daily', icon: Waypoints },
];

export const SOLO_MODES: ModeMeta[] = [
  { view: 'connections', label: 'Connections', sub: 'Name a player for both clubs', kind: 'Solo', icon: Link2 },
  { view: 'careerPath', label: 'Career Path', sub: 'Guess the player from their clubs', kind: 'Solo', icon: Compass },
  { view: 'olderYounger', label: 'Older or Younger?', sub: 'Birth-year higher or lower', kind: 'Solo', icon: Cake },
  { view: 'managers', label: 'Managers', sub: 'Name a manager of both clubs', kind: 'Solo', icon: Briefcase },
  { view: 'modes', label: 'Arcade', sub: 'Survival · Time Attack · Gauntlet', kind: 'Solo', icon: Zap },
];

export const COMPETE_MODES: ModeMeta[] = [
  { view: 'career', label: 'Career', sub: 'Climb the league pyramid', kind: 'Cup', icon: Shield },
  { view: 'cup', label: 'Cup Runs', sub: 'Knockout tournaments', kind: 'Cup', icon: Trophy },
];
