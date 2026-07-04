import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  children: ReactNode;
}

/**
 * Flat editorial variants — no lift, no glow. The shared base owns the press +
 * colour transition; each variant is a fill or a hairline outline.
 */
const VARIANTS: Record<Variant, string> = {
  // Sharp vermilion fill for the one primary action — flat, no glow.
  primary: 'bg-royal text-bone font-semibold enabled:hover:bg-royal-dark',
  // Hairline-outlined bone — the editorial secondary.
  secondary: [
    'bg-transparent text-bone font-medium border-[0.5px] border-bone/30',
    'enabled:hover:border-bone/60 enabled:hover:bg-bone/[0.04]',
  ].join(' '),
  ghost: 'bg-transparent text-bone-dim enabled:hover:text-bone enabled:hover:bg-bone/[0.05]',
  danger: 'bg-danger text-bone font-semibold enabled:hover:bg-danger/85',
  gold: 'bg-gold text-ink-900 font-bold enabled:hover:bg-gold-dark',
};

const SIZES: Record<Size, string> = {
  sm: 'px-3.5 py-1.5 text-sm rounded-md',
  md: 'px-5 py-2.5 text-sm rounded-md',
  lg: 'px-6 py-3.5 text-base rounded-md',
};

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={[
        'inline-flex items-center justify-center gap-2 select-none tracking-tight',
        // Smoothly transition transform, shadow, colour and border together.
        'transition-[transform,box-shadow,background-color,border-color,color]',
        'duration-200 ease-premium',
        'enabled:active:scale-[0.97] enabled:active:translate-y-0',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none',
        VARIANTS[variant],
        SIZES[size],
        fullWidth ? 'w-full' : '',
        className,
      ].join(' ')}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  );
}
