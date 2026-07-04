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
  // Crisp green fill, white text — the one primary action.
  primary: 'bg-royal text-white font-semibold enabled:hover:bg-royal-dark',
  // White with a thin border — the clean secondary.
  secondary: [
    'bg-white text-ink-900 font-medium border border-black/12',
    'enabled:hover:bg-black/[0.03] enabled:hover:border-black/20',
  ].join(' '),
  ghost: 'bg-transparent text-ink-600 enabled:hover:text-ink-900 enabled:hover:bg-black/[0.04]',
  danger: 'bg-danger text-white font-semibold enabled:hover:bg-danger/85',
  gold: 'bg-gold text-white font-semibold enabled:hover:bg-gold-dark',
};

const SIZES: Record<Size, string> = {
  sm: 'px-3.5 py-1.5 text-sm rounded-lg',
  md: 'px-5 py-2.5 text-sm rounded-lg',
  lg: 'px-6 py-3.5 text-base rounded-lg',
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
