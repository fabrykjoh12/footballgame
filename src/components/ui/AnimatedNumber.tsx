import { useEffect, useRef, useState } from 'react';

/** Renders a number that "bumps" (scale + flash) whenever its value changes. */
export function AnimatedNumber({
  value,
  className = '',
}: {
  value: number;
  className?: string;
}) {
  const [bump, setBump] = useState(false);
  const prev = useRef(value);

  useEffect(() => {
    if (prev.current !== value) {
      prev.current = value;
      setBump(true);
      const t = setTimeout(() => setBump(false), 500);
      return () => clearTimeout(t);
    }
  }, [value]);

  return (
    <span className={[className, bump ? 'animate-bump inline-block' : ''].join(' ')}>
      {value}
    </span>
  );
}
