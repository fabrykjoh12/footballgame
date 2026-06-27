import { winRate, type PlayerStats } from '../../engine/stats.ts';

/** Compact career-record strip. Renders nothing until a match has been played. */
export function StatsStrip({ stats }: { stats: PlayerStats }) {
  if (stats.played === 0) return null;

  const items: Array<{ label: string; value: string }> = [
    { label: 'Played', value: String(stats.played) },
    { label: 'W–D–L', value: `${stats.won}–${stats.drawn}–${stats.lost}` },
    { label: 'Win %', value: `${winRate(stats)}%` },
  ];
  if (stats.currentStreak >= 2) {
    items.push({ label: 'Streak', value: `${stats.currentStreak}🔥` });
  }

  return (
    <dl className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-center">
      {items.map((it) => (
        <div key={it.label} className="flex items-baseline gap-1.5">
          <dt className="text-[11px] uppercase tracking-wide text-ink-muted">{it.label}</dt>
          <dd className="font-display text-sm font-bold tabular-nums text-neon">{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}
