import { IconClock } from '../ui/icons';

/** Depleting countdown bar, styled like a stoppage-time clock. */
export function TimerBar({
  fraction,
  secondsLeft,
}: {
  fraction: number;
  secondsLeft: number;
}) {
  const danger = secondsLeft <= 5;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[11px] text-ink-500">
        <span className="flex items-center gap-1">
          <IconClock className="h-3.5 w-3.5" /> Stoppage time
        </span>
        <span
          className={[
            'font-mono text-sm tabular-nums',
            danger ? 'text-danger motion-safe:animate-pulse' : 'text-ink-600',
          ].join(' ')}
        >
          +{secondsLeft}s
        </span>
      </div>
      <div
        className="h-2.5 w-full overflow-hidden rounded-full bg-black/[0.05]"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(fraction * 100)}
        aria-label="Time remaining"
      >
        <div
          className={[
            'h-full rounded-full transition-[width] duration-100 ease-linear',
            danger ? 'bg-danger shadow-[0_0_12px_rgba(255,77,94,0.6)]' : 'bg-pitch',
          ].join(' ')}
          style={{ width: `${Math.max(0, Math.min(1, fraction)) * 100}%` }}
        />
      </div>
    </div>
  );
}
