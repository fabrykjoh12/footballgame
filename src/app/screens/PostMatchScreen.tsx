import { useMatch } from '../providers/MatchProvider.tsx';
import { useSettings } from '../providers/AppSettingsProvider.tsx';
import { useStats } from '../providers/StatsProvider.tsx';
import { StatsStrip } from '../../ui/stats/StatsStrip.tsx';
import type { MatchSummary } from '../../types/match.ts';

export function PostMatchScreen({ summary }: { summary: MatchSummary }) {
  const { startCpuMatch, reset } = useMatch();
  const settings = useSettings();
  const { stats } = useStats();

  const { player, opponent, scoreline } = summary;
  const homeTeam = player.side === 'home' ? player.team : opponent.team;
  const awayTeam = player.side === 'home' ? opponent.team : player.team;
  const playerWon = summary.winner === player.side;
  const isDraw = summary.winner === 'draw';

  const headline = isDraw
    ? 'Honours even'
    : playerWon
      ? 'You win!'
      : 'Defeat';

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center gap-6 px-5 text-center">
      <p
        className={[
          'font-display text-3xl font-bold',
          isDraw ? 'text-ink' : playerWon ? 'text-neon' : 'text-red-300',
        ].join(' ')}
      >
        {headline}
      </p>

      <div className="w-full rounded-2xl border border-white/10 bg-pitch-900/60 p-6">
        <div className="flex items-center justify-center gap-4 font-display">
          <span className="flex-1 text-right text-base" style={{ color: `rgb(${homeTeam.primaryRgb})` }}>
            {homeTeam.name}
          </span>
          <span className="text-4xl font-bold tabular-nums">
            {scoreline.home}–{scoreline.away}
          </span>
          <span className="flex-1 text-left text-base" style={{ color: `rgb(${awayTeam.primaryRgb})` }}>
            {awayTeam.name}
          </span>
        </div>
        {summary.wentToTiebreaker && (
          <p className="mt-2 text-xs uppercase tracking-widest text-ink-muted">
            Decided after extra time
          </p>
        )}
      </div>

      <div className="grid w-full grid-cols-3 gap-3 text-sm">
        <Stat label="Goals" value={`${scoreline.home + scoreline.away}`} />
        <Stat
          label="Your accuracy"
          value={`${accuracy(summary, 'player')}%`}
        />
        <Stat label="Questions" value={`${summary.results.length}`} />
      </div>

      <div className="w-full border-t border-white/10 pt-4">
        <p className="mb-2 text-center text-[11px] uppercase tracking-widest text-ink-muted">
          Career record
        </p>
        <StatsStrip stats={stats} />
      </div>

      <div className="flex w-full flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => startCpuMatch(settings.playerName, settings.difficulty)}
          className="flex-1 rounded-xl bg-neon-grad px-4 py-3 font-display font-bold text-pitch-950 shadow-neon transition hover:brightness-110"
        >
          Rematch
        </button>
        <button
          type="button"
          onClick={reset}
          className="flex-1 rounded-xl border border-white/10 px-4 py-3 font-semibold text-ink transition hover:border-neon/50"
        >
          Main menu
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3">
      <div className="font-display text-xl font-bold text-neon">{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-ink-muted">{label}</div>
    </div>
  );
}

function accuracy(summary: MatchSummary, who: 'player'): number {
  const total = summary.results.length;
  if (total === 0) return 0;
  const correct = summary.results.filter((r) => r[who].correct).length;
  return Math.round((correct / total) * 100);
}
