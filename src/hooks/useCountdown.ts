import { useEffect, useState } from 'react';

export interface CountdownState {
  remainingMs: number;
  /** 0 (no time left) → 1 (full time). */
  fraction: number;
  elapsedMs: number;
  secondsLeft: number;
}

/**
 * Derives a live countdown from an absolute start timestamp + duration.
 * Using `startedAt` (not a local "time remaining") keeps every client in
 * sync — guests render the same clock the host's engine is enforcing.
 *
 * Ticks ~10x/sec while `active`; cheap enough and smooth for a depleting bar.
 */
export function useCountdown(
  startedAt: number | null,
  durationMs: number,
  active: boolean,
): CountdownState {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active || startedAt == null) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, [active, startedAt]);

  if (startedAt == null) {
    return { remainingMs: durationMs, fraction: 1, elapsedMs: 0, secondsLeft: Math.ceil(durationMs / 1000) };
  }

  const elapsedMs = Math.max(0, now - startedAt);
  const remainingMs = Math.max(0, durationMs - elapsedMs);
  const fraction = durationMs > 0 ? remainingMs / durationMs : 0;
  return {
    remainingMs,
    fraction,
    elapsedMs,
    secondsLeft: Math.ceil(remainingMs / 1000),
  };
}
