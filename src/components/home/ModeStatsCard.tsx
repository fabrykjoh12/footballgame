import { useCallback, useEffect, useState } from 'react';
import { readModeProgress } from '../../lib/achievements';
import { buildModeStats, playedModeCount, type ModeStatRow } from '../../lib/modeStats';
import { Card } from '../ui/Card';
import { IconBolt } from '../ui/icons';

/**
 * Home card: a unified "your modes" board. Surfaces each solo / duel mode's
 * headline best in one place (best run, best streak, duels won…), derived from
 * the shared `ModeProgress` snapshot — so every mode you've touched shows its
 * number, and the ones you haven't nudge you to try them.
 */
export function ModeStatsCard() {
  const read = useCallback(() => {
    const m = readModeProgress();
    return { rows: buildModeStats(m), played: playedModeCount(m) };
  }, []);
  const [{ rows, played }, setData] = useState(read);

  // Re-read when the player returns to the tab or an achievement fires (both
  // signal that a mode's best may have moved).
  useEffect(() => {
    const refresh = () => setData(read());
    window.addEventListener('focus', refresh);
    window.addEventListener('bk:achievement-unlocked', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      window.removeEventListener('bk:achievement-unlocked', refresh);
    };
  }, [read]);

  return (
    <Card className="w-full p-4 animate-fade-in">
      <div className="mb-3 flex items-center gap-2">
        <IconBolt className="h-5 w-5 text-pitch" />
        <h2 className="text-[15px] font-bold text-white">Your modes</h2>
        <span className="ml-auto text-xs font-bold text-pitch">
          {played}/{rows.length} played
        </span>
      </div>
      <ul className="grid grid-cols-2 gap-1.5">
        {rows.map((r) => (
          <ModeRow key={r.key} row={r} />
        ))}
      </ul>
    </Card>
  );
}

function ModeRow({ row }: { row: ModeStatRow }) {
  return (
    <li
      className={[
        'flex items-center gap-2 rounded-lg border px-2.5 py-2 transition',
        row.played ? 'border-white/10 bg-white/[0.03]' : 'border-white/[0.06] bg-white/[0.01] opacity-55',
      ].join(' ')}
    >
      <span aria-hidden className="text-base leading-none">{row.icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12px] font-semibold text-white/85">{row.mode}</span>
        <span className="block text-[10px] text-white/45">{row.metric}</span>
      </span>
      <span className="nums shrink-0 text-sm font-black text-white">
        {row.played ? row.value.toLocaleString() : '—'}
      </span>
    </li>
  );
}
