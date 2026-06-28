/**
 * Ball Knowledge — shareable result card model (pure).
 *
 * Computes the data + flavour for a result card from a finished room, including
 * a special "accolade" for noteworthy wins (perfect match, comeback, Nightmare,
 * late winner, Daily Rival, Career promotion, Cup win). Both the canvas image
 * (`shareImage.ts`) and the copy-paste text (`shareResult.ts`) render from this
 * single model so they never drift. License-free flavour only — no real clubs.
 */

import type { Category, Room } from '../types/game';
import { MATCH_MODES } from './matchModes';
import { teamName } from './teamName';
import { summarizeMatch, type BiggestMoment } from './matchStats';
import { CATEGORY_OPTIONS } from './categories';

export type AccoladeKind =
  | 'cup_win'
  | 'promotion'
  | 'perfect'
  | 'comeback'
  | 'nightmare'
  | 'daily'
  | 'late_winner';

export interface Accolade {
  kind: AccoladeKind;
  /** Short ribbon label, e.g. "PERFECT MATCH". */
  label: string;
  /** One-line sub-text. */
  sub: string;
  emoji: string;
}

/** Occasion context the result screen can pass for Career / Cup cards. */
export interface ShareContext {
  /** Won promotion this match (Career). */
  promotion?: { divisionLabel: string };
  /** Won a cup (Cup Run final). */
  cupWin?: { cupName: string };
}

export interface ShareCardModel {
  teamA: string;
  teamB: string;
  goalsA: number;
  goalsB: number;
  pointsA: number;
  pointsB: number;
  winnerName: string | null;
  onPoints: boolean;
  /** "Modock United win" / "… win on points" / "Honours even — a draw". */
  resultBanner: string;
  accolade: Accolade | null;
  /** "90+2' Late Winner", or null. */
  momentLine: string | null;
  /** Best category for the local player (label), or null. */
  bestCategory: string | null;
  /** "8/10 correct" for the local player (falls back to player A). */
  correctLine: string;
  modeLabel: string;
}

function categoryLabel(c: Category): string {
  return CATEGORY_OPTIONS.find((o) => o.id === c)?.label ?? c;
}

function momentToLine(m: BiggestMoment | null): string | null {
  if (!m) return null;
  const minute = m.minute > 90 ? `90+${m.minute - 90}'` : `${m.minute}'`;
  return `${minute} ${m.label}`;
}

/** Build the result-card model for a finished room. */
export function buildShareCard(
  room: Room,
  localPlayerId?: string,
  ctx: ShareContext = {},
): ShareCardModel | null {
  const [a, b] = room.players;
  if (!a || !b) return null;

  const winner =
    a.goals !== b.goals
      ? a.goals > b.goals
        ? a
        : b
      : a.score !== b.score
        ? a.score > b.score
          ? a
          : b
        : null;
  const onPoints = !!winner && a.goals === b.goals;
  const resultBanner = !winner
    ? 'Honours even — a draw'
    : `${teamName(winner.name)} win${onPoints ? ' on points' : ''}`;

  const summary = summarizeMatch(room);
  const me = room.players.find((p) => p.id === localPlayerId) ?? a;
  const total = room.selectedQuestions.length;
  const meStats = summary.players[me.id];

  const accolade = pickAccolade({
    room,
    ctx,
    winnerId: winner?.id ?? null,
    localWon: winner?.id === me.id,
    meCorrect: me.correctAnswers,
    total,
    meDeficit: meStats?.maxDeficit ?? 0,
    biggest: summary.biggest,
  });

  return {
    teamA: teamName(a.name),
    teamB: teamName(b.name),
    goalsA: a.goals,
    goalsB: b.goals,
    pointsA: a.score,
    pointsB: b.score,
    winnerName: winner ? teamName(winner.name) : null,
    onPoints,
    resultBanner,
    accolade,
    momentLine: momentToLine(summary.biggest),
    bestCategory: meStats?.bestCategory ? categoryLabel(meStats.bestCategory.category) : null,
    correctLine: `${me.correctAnswers}/${total} correct`,
    modeLabel: MATCH_MODES[room.settings.mode].label,
  };
}

function pickAccolade(input: {
  room: Room;
  ctx: ShareContext;
  winnerId: string | null;
  localWon: boolean;
  meCorrect: number;
  total: number;
  meDeficit: number;
  biggest: BiggestMoment | null;
}): Accolade | null {
  const { room, ctx, localWon, meCorrect, total, meDeficit, biggest } = input;

  // Occasion cards (passed explicitly) take priority.
  if (ctx.cupWin) {
    return {
      kind: 'cup_win',
      label: 'CUP WINNERS',
      sub: ctx.cupWin.cupName,
      emoji: '🏆',
    };
  }
  if (ctx.promotion) {
    return {
      kind: 'promotion',
      label: 'PROMOTED',
      sub: `Up to the ${ctx.promotion.divisionLabel}`,
      emoji: '⬆️',
    };
  }

  // A flawless match — works for a win or draw, it's about the player.
  if (total > 0 && meCorrect === total) {
    return {
      kind: 'perfect',
      label: 'PERFECT MATCH',
      sub: `${meCorrect}/${total} — flawless`,
      emoji: '💯',
    };
  }

  // Win-only accolades below.
  if (localWon) {
    if (meDeficit >= 2) {
      return {
        kind: 'comeback',
        label: 'COMEBACK WIN',
        sub: `Came back from ${meDeficit} down`,
        emoji: '🔥',
      };
    }
    if (room.settings.mode === 'nightmare') {
      return {
        kind: 'nightmare',
        label: 'NIGHTMARE CONQUERED',
        sub: 'Won on the hardest setting',
        emoji: '😈',
      };
    }
    if (biggest?.kind === 'late_winner' && biggest.playerId === input.winnerId) {
      return {
        kind: 'late_winner',
        label: 'LATE WINNER',
        sub: momentToLine(biggest) ?? 'Snatched it late',
        emoji: '⏱️',
      };
    }
  }

  if (room.settings.isDaily) {
    return {
      kind: 'daily',
      label: 'DAILY RIVAL',
      sub: 'Today’s fixture',
      emoji: '📅',
    };
  }

  return null;
}
