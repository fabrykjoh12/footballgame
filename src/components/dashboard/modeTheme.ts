/**
 * Per-mode visual identity — one shared shape, a distinct "show" per mode.
 * Each theme drives the hero banner (accent, gradient, motif), an emblem icon,
 * and mode-flavoured copy. Art-ready: `image` can later point at generated
 * artwork; until then a code-drawn motif carries the atmosphere.
 */
import {
  Fingerprint,
  Radar,
  Waypoints,
  Route,
  Zap,
  ClipboardList,
  Trophy,
  Shield,
  Gamepad2,
  type LucideIcon,
} from 'lucide-react';
import type { View } from '../../lib/viewRoute';

export type MotifKey =
  | 'corkboard'
  | 'radar'
  | 'nodes'
  | 'timeline'
  | 'spotlights'
  | 'chalkboard'
  | 'bracket'
  | 'pitch'
  | 'pulse'
  | 'rondo';

export interface ModeTheme {
  accent: string; // primary identity colour (hex)
  accent2: string; // secondary glow colour (hex)
  emblem: LucideIcon;
  motif: MotifKey;
  eyebrow: string; // small kicker above the title
  title: string;
  tagline: string; // one atmospheric line
  /** Optional artwork URL (drop generated art here when available). */
  image?: string;
}

export const MODE_THEMES: Partial<Record<View, ModeTheme>> = {
  mystery: {
    accent: '#F5C542',
    accent2: '#2ED573',
    emblem: Fingerprint,
    motif: 'corkboard',
    eyebrow: 'Football detective',
    title: 'Mystery Duel',
    tagline: 'Two hidden files. Trade scout reports, read the evidence, name the suspect.',
  },
  scout: {
    accent: '#3B82F6',
    accent2: '#2ED573',
    emblem: Radar,
    motif: 'radar',
    eyebrow: 'Recruitment department',
    title: 'The Scout',
    tagline: 'Read the pattern behind the signings. File your report before they file theirs.',
  },
  scoutDaily: {
    accent: '#3B82F6',
    accent2: '#F5C542',
    emblem: Radar,
    motif: 'radar',
    eyebrow: 'Daily assignment',
    title: 'Daily Scout',
    tagline: "One secret recruitment rule. Crack it in the fewest reports.",
  },
  rondo: {
    accent: '#2ED573',
    accent2: '#3B82F6',
    emblem: Waypoints,
    motif: 'rondo',
    eyebrow: 'Keep-ball duel',
    title: 'Rondo',
    tagline: 'One rule, two players, no repeats. Keep the ball moving — lose it and concede.',
  },
  connections: {
    accent: '#8B5CF6',
    accent2: '#3B82F6',
    emblem: Waypoints,
    motif: 'nodes',
    eyebrow: 'The football web',
    title: 'Connections',
    tagline: 'Every club, league and nation is a node. Find the player that links them.',
  },
  connectionsDaily: {
    accent: '#8B5CF6',
    accent2: '#F5C542',
    emblem: Waypoints,
    motif: 'nodes',
    eyebrow: 'Daily link',
    title: 'Daily Connections',
    tagline: 'One club pairing a day. Keep the chain — and the streak — alive.',
  },
  careerPath: {
    accent: '#EC4899',
    accent2: '#F5C542',
    emblem: Route,
    motif: 'timeline',
    eyebrow: 'The journey',
    title: 'Career Path',
    tagline: 'A trail of clubs, one player. Retrace the transfers and name them.',
  },
  olderYounger: {
    accent: '#F97316',
    accent2: '#F5C542',
    emblem: Zap,
    motif: 'spotlights',
    eyebrow: 'Rapid fire',
    title: 'Older or Younger?',
    tagline: 'Beat the clock. Read the birth years. Keep the run going under the lights.',
  },
  managers: {
    accent: '#10B981',
    accent2: '#3B82F6',
    emblem: ClipboardList,
    motif: 'chalkboard',
    eyebrow: 'The dugout',
    title: 'Managers',
    tagline: 'Two clubs, one gaffer. Make the call from the touchline.',
  },
  cup: {
    accent: '#F5C542',
    accent2: '#EF4444',
    emblem: Trophy,
    motif: 'bracket',
    eyebrow: 'Knockout nights',
    title: 'Cup Runs',
    tagline: 'One defeat and you are out. Survive the bracket, lift the trophy.',
  },
  career: {
    accent: '#3B82F6',
    accent2: '#2ED573',
    emblem: Shield,
    motif: 'pitch',
    eyebrow: 'Manager mode',
    title: 'Career',
    tagline: 'Take a club from the fourth tier to the top. Win, get promoted, repeat.',
  },
  modes: {
    accent: '#06B6D4',
    accent2: '#2ED573',
    emblem: Gamepad2,
    motif: 'pulse',
    eyebrow: 'Arcade zone',
    title: 'Arcade',
    tagline: 'Survival, Time Attack, Gauntlet. Chase the high score, ride the combo.',
  },
};

export function modeTheme(view: View): ModeTheme | undefined {
  return MODE_THEMES[view];
}
