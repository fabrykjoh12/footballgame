/**
 * Builds a copy-paste friendly result summary for sharing in a group chat.
 */

import type { Player, Room } from '../types/game';
import { MATCH_MODES } from './matchModes';
import { teamName } from './teamName';
import { accuracyPercent } from './scoring';

export function buildShareText(room: Room): string {
  const [a, b] = room.players;
  if (!a || !b) return 'Ball Knowledge';

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

  const result = winner
    ? `🏆 ${teamName(winner.name)} win!`
    : '🤝 Honours even — it’s a draw!';

  return [
    '⚽ Ball Knowledge',
    `${teamName(a.name)} ${a.goals}–${b.goals} ${teamName(b.name)}`,
    '',
    line(a),
    line(b),
    '',
    result,
    `Mode: ${modeLabel}`,
    'Prove your football IQ → play a friend.',
  ].join('\n');
}
