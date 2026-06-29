import type { Player } from '../../types/game';
import { teamName } from '../../lib/teamName';
import { matchIdentities, type TeamIdentity } from '../../lib/teamIdentity';
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

  const [idA, idB] = matchIdentities(a.name, b.name);

  return (
    <div className="glass-strong sticky top-2 z-20 px-3 py-3 sm:px-5">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <TeamSide player={a} isLocal={a.id === localPlayerId} align="left" identity={idA} />

        <div className="flex flex-col items-center px-1">
          <div className="nums flex items-center gap-2 font-display text-3xl font-bold sm:text-4xl">
            <span style={{ color: idA.color }}>
              <AnimatedNumber value={a.goals} />
            </span>
            <span className="text-white/30">–</span>
            <span style={{ color: idB.color }}>
              <AnimatedNumber value={b.goals} />
            </span>
          </div>
          {questionNumber != null && totalQuestions != null && (
            <div className="nums mt-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
              Q {questionNumber}/{totalQuestions}
            </div>
          )}
        </div>

        <TeamSide player={b} isLocal={b.id === localPlayerId} align="right" identity={idB} />
      </div>
    </div>
  );
}

function TeamSide({
  player,
  isLocal,
  align,
  identity,
}: {
  player: Player;
  isLocal: boolean;
  align: 'left' | 'right';
  identity: TeamIdentity;
}) {
  const right = align === 'right';
  const kit = (
    <span
      aria-hidden
      className="h-2.5 w-2.5 shrink-0 rounded-full"
      style={{ backgroundColor: identity.color, boxShadow: `0 0 8px ${identity.ring}` }}
    />
  );
  const offline = !player.connected && (
    <span
      className="h-2 w-2 shrink-0 rounded-full bg-white/30"
      title="Disconnected"
      aria-label="Disconnected"
    />
  );
  const you = isLocal && (
    <span className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white/70">
      You
    </span>
  );

  return (
    <div className={right ? 'text-right' : 'text-left'}>
      <div className={['flex items-center gap-1.5', right ? 'justify-end' : 'justify-start'].join(' ')}>
        {right ? (
          <>
            {you}
            <span className="truncate text-sm font-semibold sm:text-base">{teamName(player.name)}</span>
            {offline}
            {kit}
          </>
        ) : (
          <>
            {kit}
            {offline}
            <span className="truncate text-sm font-semibold sm:text-base">{teamName(player.name)}</span>
            {you}
          </>
        )}
      </div>
      <div
        className={[
          'mt-0.5 flex items-center gap-2 text-xs text-white/50',
          right ? 'justify-end' : 'justify-start',
        ].join(' ')}
      >
        <span className="nums font-mono">
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
