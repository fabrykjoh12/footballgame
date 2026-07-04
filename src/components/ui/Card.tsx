import type { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Stronger blur/contrast surface for hero cards. */
  strong?: boolean;
  /** Add an indigo glow. */
  glow?: boolean;
  /** Flat white surface with dark text (the playfootball-style list card). */
  lite?: boolean;
}

export function Card({
  children,
  strong = false,
  glow = false,
  lite = false,
  className = '',
  ...rest
}: CardProps) {
  return (
    <div
      className={[
        lite ? 'card-lite' : strong ? 'glass-strong' : 'glass',
        glow ? 'shadow-glow' : '',
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </div>
  );
}
