/**
 * Builds a copy-paste friendly result summary for sharing in a group chat.
 * Pulls the headline / accolade / biggest-moment flavour from the shared
 * `shareCard` model so the text and the image card stay in sync.
 */

import type { Player, Room } from '../types/game';
import { MATCH_MODES } from './matchModes';
import { teamName } from './teamName';
import { accuracyPercent } from './scoring';
import { buildShareCard, type ShareContext } from './shareCard';

/**
 * A short football-style headline for the result, e.g. "Dominant 4–1
 * performance." or "Won on football IQ." Pure + deterministic so both the
 * share text and any UI can reuse it.
 */
export function matchHeadline(room: Room, localPlayerId?: string): string {
  const [a, b] = room.players;
  if (!a || !b) return 'Full time.';
  const levelOnGoals = a.goals === b.goals;

  if (levelOnGoals && a.score === b.score) return 'Honours even at full time.';
  const winner = levelOnGoals ? (a.score > b.score ? a : b) : a.goals > b.goals ? a : b;
  const loser = winner === a ? b : a;
  const margin = Math.abs(winner.goals - loser.goals);
  const nightmare = room.settings.mode === 'nightmare';
  const you = localPlayerId ? room.players.find((p) => p.id === localPlayerId) : undefined;
  const wonIt = you ? you.id === winner.id : true;

  if (levelOnGoals) return 'Won on football IQ — a points decision.';
  if (nightmare && wonIt) return 'Nightmare Mode survived.';
  if (margin >= 3) return `Dominant ${winner.goals}–${loser.goals} performance.`;
  if (margin === 2) return `Comfortable ${winner.goals}–${loser.goals} win.`;
  return `${teamName(winner.name)} edge a ${winner.goals}–${loser.goals} thriller.`;
}

/**
 * Share the result via the Web Share API when available, falling back to the
 * clipboard. Returns how it was shared so the UI can show the right toast.
 */
export async function shareResultText(text: string): Promise<'shared' | 'copied' | 'failed'> {
  const nav = typeof navigator !== 'undefined' ? navigator : undefined;
  if (typeof nav?.share === 'function') {
    try {
      await nav.share({ title: 'Ball Knowledge', text });
      return 'shared';
    } catch {
      // User cancelled or share failed — fall through to clipboard.
    }
  }
  const writeText = nav?.clipboard?.writeText;
  if (typeof writeText === 'function') {
    try {
      await writeText.call(nav!.clipboard, text);
      return 'copied';
    } catch {
      return 'failed';
    }
  }
  return 'failed';
}

export function buildShareText(
  room: Room,
  localPlayerId?: string,
  ctx?: ShareContext,
): string {
  const [a, b] = room.players;
  if (!a || !b) return 'Ball Knowledge';

  const card = buildShareCard(room, localPlayerId, ctx);
  const modeLabel = MATCH_MODES[room.settings.mode].label;
  const winner =
    a.goals === b.goals
      ? a.score === b.score
        ? null
        : a.score > b.score
          ? a
          : b
      : a.goals > b.goals
        ? a
        : b;

  const line = (p: Player) =>
    `${teamName(p.name)} — ${p.goals} ⚽ | ${p.score} pts | ${accuracyPercent(
      p.correctAnswers,
      room.selectedQuestions.length,
    )}% acc`;

  const levelOnGoals = a.goals === b.goals;
  const result = winner
    ? `🏆 ${teamName(winner.name)} win${levelOnGoals ? ' on points!' : '!'}`
    : '🤝 Honours even — it’s a draw!';

  const lines = [
    '⚽ Ball Knowledge',
    `${teamName(a.name)} ${a.goals}–${b.goals} ${teamName(b.name)}`,
    matchHeadline(room, localPlayerId),
  ];

  if (card?.accolade) {
    lines.push('', `${card.accolade.emoji} ${card.accolade.label} — ${card.accolade.sub}`);
  }
  if (card?.momentLine) {
    lines.push(card.accolade ? card.momentLine : `\n${card.momentLine}`);
  }

  lines.push('', line(a), line(b), '', result);
  if (card?.bestCategory) lines.push(`Best category: ${card.bestCategory}`);
  lines.push(
    `Mode: ${modeLabel}`,
    '',
    '⚔️ Think you can beat this? Every answer scores goals.',
    '👉 Play Ball Knowledge.',
  );

  return lines.join('\n');
}
