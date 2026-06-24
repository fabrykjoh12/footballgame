/**
 * Commentary engine — turns match events into live text lines.
 *
 * Pure function of (event, context). Template pools with variable slots; no
 * external data, no media. This is what makes trivia *feel* like football.
 */

import type { QuestionResult, Scoreline } from '../../types/match.ts';

export interface CommentaryContext {
  playerTeam: string;
  opponentTeam: string;
  scoreline: Scoreline;
  playerSide: 'home' | 'away';
}

function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? '');
}

const GOAL_LINES = [
  'GOAL! {team} find the net — clinical from the spot of knowledge!',
  'It’s in! {team} punish a moment of hesitation!',
  '{team} strike! A crisp answer turned into a crisp finish!',
  'Back of the net for {team} — the crowd is up!',
];

const MISS_LINES = [
  '{team} go close but it’s wide — wrong call under pressure!',
  'Saved! {team} couldn’t find the right answer in time.',
  'Off target from {team} — that one will sting.',
];

const LEVEL_LINES = ['We are all square — {home} {hs}–{as} {away}.'];
const LEAD_LINES = ['{leader} edge ahead — {home} {hs}–{as} {away}.'];

/** Pick deterministically from a pool using the question index. */
function pick(pool: readonly string[], salt: number): string {
  return pool[salt % pool.length] as string;
}

/** Produce one or two commentary lines for a freshly revealed question. */
export function commentForResult(
  result: QuestionResult,
  ctx: CommentaryContext,
): string[] {
  const lines: string[] = [];
  const playerTeam = ctx.playerTeam;
  const opponentTeam = ctx.opponentTeam;

  if (result.playerGoals > 0) {
    lines.push(fill(pick(GOAL_LINES, result.index), { team: playerTeam }));
  } else if (result.player.correct) {
    lines.push(
      fill(pick(MISS_LINES, result.index + 1), { team: playerTeam }),
    );
  }

  if (result.opponentGoals > 0) {
    lines.push(fill(pick(GOAL_LINES, result.index + 2), { team: opponentTeam }));
  }

  const { home, away } = ctx.scoreline;
  const vars = {
    home: String(home),
    away: String(away),
    hs: String(home),
    as: String(away),
    leader: home === away ? '' : home > away ? homeTeam(ctx) : awayTeam(ctx),
  };
  lines.push(
    home === away
      ? fill(pick(LEVEL_LINES, result.index), { ...vars, ...teamVars(ctx) })
      : fill(pick(LEAD_LINES, result.index), { ...vars, ...teamVars(ctx) }),
  );

  return lines;
}

function teamVars(ctx: CommentaryContext): Record<string, string> {
  return { home: homeTeam(ctx), away: awayTeam(ctx) };
}
function homeTeam(ctx: CommentaryContext): string {
  return ctx.playerSide === 'home' ? ctx.playerTeam : ctx.opponentTeam;
}
function awayTeam(ctx: CommentaryContext): string {
  return ctx.playerSide === 'home' ? ctx.opponentTeam : ctx.playerTeam;
}

export function kickoffLine(ctx: CommentaryContext): string {
  return `Kickoff! ${homeTeam(ctx)} vs ${awayTeam(ctx)} — game on.`;
}
