import type { Player } from '../../types/game';
import { teamName } from '../../lib/teamName';
import { AnimatedNumber } from '../ui/AnimatedNumber';
import { IconFlame } from '../ui/icons';

interface ScoreboardProps {
  players: Player[];
  localPlayerId: string;
  questionNumber?: number;
  totalQuestions?: number;
}

/** Always-visible match scoreboard: football score + raw points for both. */
export function Scoreboard({
  players,
  localPlayerId,
  questionNumber,
  totalQuestions,
}: ScoreboardProps) {
  const [a, b] = players;
  if (!a || !b) return null;

  return (
    <div className="glass-strong sticky top-2 z-20 px-3 py-3 sm:px-5">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <TeamSide player={a} isLocal={a.id === localPlayerId} align="left" />

        <div className="flex flex-col items-center px-1">
          <div className="flex items-center gap-2 font-display text-3xl font-bold sm:text-4xl">
            <AnimatedNumber value={a.goals} className="text-pitch" />
            <span className="text-white/40">–</span>
            <AnimatedNumber value={b.goals} className="text-pitch" />
          </div>
          {questionNumber != null && totalQuestions != null && (
            <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
              Q {questionNumber}/{totalQuestions}
            </div>
          )}
        </div>

        <TeamSide player={b} isLocal={b.id === localPlayerId} align="right" />
      </div>
    </div>
  );
}

function TeamSide({
  player,
  isLocal,
  align,
}: {
  player: Player;
  isLocal: boolean;
  align: 'left' | 'right';
}) {
  const right = align === 'right';
  return (
    <div className={right ? 'text-right' : 'text-left'}>
      <div
        className={[
          'flex items-center gap-1.5',
          right ? 'justify-end' : 'justify-start',
        ].join(' ')}
      >
        {!player.connected && (
          <span
            className="h-2 w-2 rounded-full bg-white/30"
            title="Disconnected"
            aria-label="Disconnected"
          />
        )}
        <span className="truncate text-sm font-semibold sm:text-base">
          {teamName(player.name)}
        </span>
        {isLocal && (
          <span className="rounded bg-pitch/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-pitch">
            You
          </span>
        )}
      </div>
      <div
        className={[
          'mt-0.5 flex items-center gap-2 text-xs text-white/50',
          right ? 'justify-end' : 'justify-start',
        ].join(' ')}
      >
        <span className="font-mono">
          <AnimatedNumber value={player.score} /> pts
        </span>
        {player.streak >= 2 && (
          <span className="flex items-center gap-0.5 text-gold" title={`${player.streak} in a row`}>
            <IconFlame className="h-3.5 w-3.5" />
            {player.streak}
          </span>
        )}
      </div>
    </div>
  );
}
