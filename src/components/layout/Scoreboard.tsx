import type { Player } from '../../types/game';
import { teamName } from '../../lib/teamName';
import { matchIdentities, type TeamIdentity } from '../../lib/teamIdentity';
import { AnimatedNumber } from '../ui/AnimatedNumber';
import { IconFlame } from '../ui/icons';
import { AttackMeter } from '../game/AttackMeter';

interface ScoreboardProps {
  players: Player[];
  localPlayerId: string;
  questionNumber?: number;
  totalQuestions?: number;
  /** Show the live attack/pressure meters (hidden before kick-off). */
  showMeters?: boolean;
}

/** Always-visible match scoreboard: football score + raw points for both. */
export function Scoreboard({
  players,
  localPlayerId,
  questionNumber,
  totalQuestions,
  showMeters = true,
}: ScoreboardProps) {
  const [a, b] = players;
  if (!a || !b) return null;

  const [idA, idB] = matchIdentities(a.name, b.name);

  return (
    <div className="glass-strong sticky top-2 z-20 px-3 py-3 sm:px-5">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <TeamSide player={a} isLocal={a.id === localPlayerId} align="left" identity={idA} />

        <div className="flex flex-col items-center px-1">
          <div className="nums flex items-baseline gap-2.5 font-display text-4xl font-black leading-none tracking-tight sm:text-5xl">
            <span style={{ color: idA.color }}>
              <AnimatedNumber value={a.goals} />
            </span>
            <span className="text-lg text-white/30 sm:text-xl">–</span>
            <span style={{ color: idB.color }}>
              <AnimatedNumber value={b.goals} />
            </span>
          </div>
          {questionNumber != null && totalQuestions != null && (
            <div className="nums mt-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
              Question {questionNumber} / {totalQuestions}
            </div>
          )}
        </div>

        <TeamSide player={b} isLocal={b.id === localPlayerId} align="right" identity={idB} />
      </div>

      {showMeters && (
        <div className="mt-2.5 grid grid-cols-2 gap-3 border-t border-white/[0.06] pt-2.5">
          <AttackMeter score={a.score} streak={a.streak} identity={idA} align="left" />
          <AttackMeter score={b.score} streak={b.streak} identity={idB} align="right" />
        </div>
      )}
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
      style={{ backgroundColor: identity.color }}
    />
  );
  const offline = !player.connected && (
    <span
      className="h-2 w-2 shrink-0 rounded-full bg-white/25"
      title="Disconnected"
      aria-label="Disconnected"
    />
  );
  const you = isLocal && (
    <span className="rounded bg-white/[0.05] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white/65">
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
          'mt-0.5 flex items-center gap-2 text-xs text-white/55',
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
