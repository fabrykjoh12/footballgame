import { useEffect, useRef, useState } from 'react';

/**
 * A number that eases to its target instead of snapping — the shared motion
 * language for counters (shortlist, streak, score). Respects reduced motion.
 */
export function AnimatedCounter({
  value,
  className,
  duration = 500,
}: {
  value: number;
  className?: string;
  duration?: number;
}) {
  const [shown, setShown] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef<number>();

  useEffect(() => {
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const from = fromRef.current;
    const to = value;
    if (reduce || from === to) {
      fromRef.current = to;
      setShown(to);
      return;
    }
    let start: number | null = null;
    const tick = (t: number) => {
      if (start === null) start = t;
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
      setShown(Math.round(from + (to - from) * eased));
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
      else fromRef.current = to;
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      fromRef.current = to;
    };
  }, [value, duration]);

  return <span className={`nums ${className ?? ''}`}>{shown}</span>;
}
