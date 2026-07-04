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
  // Bright green fill, dark text — the primary action, with a soft green lift.
  primary:
    'bg-royal text-ink-900 font-semibold shadow-[0_6px_20px_-8px_rgba(46,213,115,0.7)] enabled:hover:bg-royal-glow enabled:hover:shadow-[0_10px_28px_-8px_rgba(46,213,115,0.8)] motion-safe:enabled:hover:-translate-y-0.5',
  // Dark chip with a subtle border — the secondary.
  secondary: [
    'bg-white/[0.06] text-white font-medium border border-white/10',
    'enabled:hover:bg-white/[0.1] enabled:hover:border-white/20',
  ].join(' '),
  ghost: 'bg-transparent text-white/65 enabled:hover:text-white enabled:hover:bg-white/[0.06]',
  danger: 'bg-danger text-white font-semibold enabled:hover:bg-danger/85',
  gold: 'bg-gold text-ink-900 font-semibold enabled:hover:bg-gold-dark',
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

/** Convenience wrappers so intent reads clearly at call sites. */
export function PrimaryButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button variant="primary" {...props} />;
}
export function SecondaryButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button variant="secondary" {...props} />;
}
