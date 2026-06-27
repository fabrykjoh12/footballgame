import type { PlayerInfo, OpponentInfo, Scoreline } from '../../types/match.ts';

interface ScoreboardProps {
  player: PlayerInfo;
  opponent: OpponentInfo;
  scoreline: Scoreline;
  /** Question progress, e.g. "3 / 10" or "ET". */
  clock?: string;
}

function TeamBadge({ name, rgb }: { name: string; rgb: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span
        className="h-3 w-3 shrink-0 rounded-full ring-2 ring-white/10"
        style={{ backgroundColor: `rgb(${rgb})` }}
      />
      <span className="truncate font-display text-sm font-semibold sm:text-base">
        {name}
      </span>
    </div>
  );
}

export function Scoreboard({ player, opponent, scoreline, clock }: ScoreboardProps) {
  const homeTeam = player.side === 'home' ? player.team : opponent.team;
  const awayTeam = player.side === 'home' ? opponent.team : player.team;

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 backdrop-blur">
      <div className="flex flex-1 justify-end">
        <TeamBadge name={homeTeam.name} rgb={homeTeam.primaryRgb} />
      </div>
      <div className="flex shrink-0 flex-col items-center">
        <div
          key={`${scoreline.home}-${scoreline.away}`}
          aria-label={`Score: ${homeTeam.name} ${scoreline.home}, ${awayTeam.name} ${scoreline.away}`}
          className="animate-score-pop font-display text-2xl font-bold tabular-nums sm:text-3xl"
        >
          {scoreline.home} <span className="text-ink-muted">–</span> {scoreline.away}
        </div>
        {clock && (
          <div className="text-[10px] uppercase tracking-widest text-ink-muted">{clock}</div>
        )}
      </div>
      <div className="flex flex-1 justify-start">
        <TeamBadge name={awayTeam.name} rgb={awayTeam.primaryRgb} />
      </div>
    </div>
  );
}
