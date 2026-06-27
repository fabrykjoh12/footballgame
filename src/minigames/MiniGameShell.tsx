/**
 * MiniGameShell — shared chrome for every mini-game: a title chip and a
 * shrinking time bar. Individual games render only their unique body inside.
 */

import { useEffect, useState, type ReactNode } from 'react';

interface MiniGameShellProps {
  title: string;
  /** Absolute epoch-ms deadline, or null when not timed. */
  deadline: number | null;
  /** When true, the timer is frozen (manual pause). */
  paused?: boolean;
  children: ReactNode;
}

export function MiniGameShell({ title, deadline, paused = false, children }: MiniGameShellProps) {
  const remaining = useTimeRemaining(deadline, paused);
  const pct = deadline ? Math.max(0, Math.min(100, remaining.pct)) : 100;
  const low = pct < 30;

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-pitch-900/60 p-5 shadow-neon/0 backdrop-blur">
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-neon/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-neon">
          {title}
        </span>
        {deadline && (
          <span
            className={[
              'font-display text-sm tabular-nums',
              low ? 'text-red-300' : 'text-ink-muted',
            ].join(' ')}
          >
            {Math.ceil(remaining.ms / 1000)}s
          </span>
        )}
      </div>
      {deadline && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className={[
              'h-full rounded-full transition-[width] duration-200 ease-linear',
              low ? 'bg-red-400' : 'bg-neon-grad',
            ].join(' ')}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      {children}
    </section>
  );
}

function useTimeRemaining(
  deadline: number | null,
  frozen = false,
): { ms: number; pct: number } {
  const [, force] = useState(0);
  useEffect(() => {
    if (!deadline || frozen) return;
    const id = setInterval(() => force((n) => n + 1), 200);
    return () => clearInterval(id);
  }, [deadline, frozen]);

  if (!deadline) return { ms: 0, pct: 100 };
  const ms = Math.max(0, deadline - Date.now());
  // We don't know the original window here, so estimate against a 12s cap.
  const pct = Math.min(100, (ms / 12000) * 100);
  return { ms, pct };
}
