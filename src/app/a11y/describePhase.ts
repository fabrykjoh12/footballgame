/**
 * Pure mapping from match state to a concise, screen-reader-friendly summary
 * of "what's happening now". Used by ScreenAnnouncer's live region so assistive
 * tech users track phase changes without watching the screen.
 */

import { QUESTIONS_PER_MATCH } from '../../types/match.ts';
import type { MatchState } from '../../engine/matchReducer.ts';

export function describePhase(state: MatchState): string {
  const { phase, player, opponent } = state;
  const playerTeam = player?.team.name ?? 'You';
  const opponentTeam = opponent?.team.name ?? 'CPU';

  switch (phase.kind) {
    case 'main_menu':
      return 'Main menu.';
    case 'matchmaking':
      return phase.mode === 'cpu' ? 'Setting up a CPU match.' : 'Finding an opponent.';
    case 'countdown':
      return phase.secondsLeft > 0
        ? `Kickoff in ${phase.secondsLeft}.`
        : 'Kick off!';
    case 'in_question':
      return `Question ${phase.index + 1} of ${QUESTIONS_PER_MATCH}.`;
    case 'question_reveal': {
      const r = phase.result;
      const verb =
        r.playerGoals > 1
          ? 'Brace! Two goals.'
          : r.playerGoals === 1
            ? 'Goal!'
            : r.player.correct
              ? 'Correct, but no goal.'
              : 'Missed.';
      return verb;
    }
    case 'half_time':
      return `Half time. ${playerTeam} ${scoreFor(state, 'player')}, ${opponentTeam} ${scoreFor(state, 'opponent')}.`;
    case 'tiebreaker':
      return `Sudden death, round ${phase.round}.`;
    case 'post_match': {
      const s = phase.summary;
      const result =
        s.winner === 'draw'
          ? 'Draw'
          : s.winner === s.player.side
            ? 'You win'
            : 'You lose';
      return `Full time. ${result}. ${s.scoreline.home}–${s.scoreline.away}.`;
    }
    case 'error':
      return 'An error occurred. Returning to the menu is available.';
    default:
      return '';
  }
}

function scoreFor(state: MatchState, who: 'player' | 'opponent'): number {
  let goals = 0;
  for (const r of state.results) {
    goals += who === 'player' ? r.playerGoals : r.opponentGoals;
  }
  return goals;
}
