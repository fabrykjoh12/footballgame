import type { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Stronger blur/contrast surface for hero cards. */
  strong?: boolean;
  /** Add a neon pitch glow. */
  glow?: boolean;
}

export function Card({
  children,
  strong = false,
  glow = false,
  className = '',
  ...rest
}: CardProps) {
  return (
    <div
      className={[
        strong ? 'glass-strong' : 'glass',
        glow ? 'shadow-glow' : '',
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </div>
  );
}
