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
  ];

  if (card?.accolade) {
    lines.push('', `${card.accolade.emoji} ${card.accolade.label} — ${card.accolade.sub}`);
  }
  if (card?.momentLine) {
    lines.push(card.accolade ? card.momentLine : `\n${card.momentLine}`);
  }

  lines.push('', line(a), line(b), '', result);
  if (card?.bestCategory) lines.push(`Best category: ${card.bestCategory}`);
  lines.push(`Mode: ${modeLabel}`, 'Prove your football IQ → play a friend.');

  return lines.join('\n');
}
