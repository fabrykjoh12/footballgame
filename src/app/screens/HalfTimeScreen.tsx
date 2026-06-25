import { useMatch } from '../providers/MatchProvider.tsx';
import type { PlayerInfo, OpponentInfo, Scoreline } from '../../types/match.ts';

interface HalfTimeScreenProps {
  scoreline: Scoreline;
  player: PlayerInfo | null;
  opponent: OpponentInfo | null;
}

export function HalfTimeScreen({ scoreline, player, opponent }: HalfTimeScreenProps) {
  const { resumeFromHalfTime } = useMatch();
  const homeTeam = player?.side === 'home' ? player?.team : opponent?.team;
  const awayTeam = player?.side === 'home' ? opponent?.team : player?.team;

  const lead =
    scoreline.home === scoreline.away
      ? 'All square at the break.'
      : `${(scoreline.home > scoreline.away ? homeTeam : awayTeam)?.name} lead at the break.`;

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center gap-7 px-5 text-center">
      <p className="font-display text-sm uppercase tracking-[0.3em] text-neon">
        Half time
      </p>

      <div className="w-full rounded-2xl border border-white/10 bg-pitch-900/60 p-6">
        <div className="flex items-center justify-center gap-4 font-display">
          <span className="flex-1 text-right text-base" style={{ color: `rgb(${homeTeam?.primaryRgb})` }}>
            {homeTeam?.name}
          </span>
          <span className="animate-score-pop text-4xl font-bold tabular-nums">
            {scoreline.home}–{scoreline.away}
          </span>
          <span className="flex-1 text-left text-base" style={{ color: `rgb(${awayTeam?.primaryRgb})` }}>
            {awayTeam?.name}
          </span>
        </div>
      </div>

      <p className="text-sm text-ink-muted">{lead}</p>

      <button
        type="button"
        onClick={resumeFromHalfTime}
        className="rounded-xl bg-neon-grad px-6 py-3 font-display font-bold text-pitch-950 shadow-neon transition hover:brightness-110"
      >
        Start second half
      </button>
      <p className="text-xs text-ink-muted">…or sit tight, we’ll kick off shortly.</p>
    </div>
  );
}
