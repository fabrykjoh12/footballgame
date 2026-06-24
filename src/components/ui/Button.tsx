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
 * Variants carry their resting + hover + (where relevant) lift styles. Hover
 * lift is gated on `enabled` (no movement when disabled) and `motion-safe`
 * (respects reduced-motion). The shared base owns the press + transition.
 */
const LIFT = 'motion-safe:enabled:hover:-translate-y-0.5';

const VARIANTS: Record<Variant, string> = {
  primary: [
    'bg-pitch text-ink-900 font-semibold',
    'shadow-[0_4px_16px_-2px_rgba(22,255,122,0.40)]',
    'enabled:hover:bg-pitch-glow enabled:hover:shadow-[0_10px_30px_-6px_rgba(22,255,122,0.60)]',
    LIFT,
  ].join(' '),
  secondary: [
    'bg-white/[0.06] text-white font-medium border border-white/12',
    'enabled:hover:bg-white/[0.1] enabled:hover:border-white/25',
    LIFT,
  ].join(' '),
  ghost: 'bg-transparent text-white/70 enabled:hover:text-white enabled:hover:bg-white/[0.06]',
  danger: [
    'bg-danger/90 text-white font-semibold',
    'shadow-[0_4px_16px_-2px_rgba(255,77,94,0.40)]',
    'enabled:hover:bg-danger',
    LIFT,
  ].join(' '),
  gold: [
    'bg-gold text-ink-900 font-bold',
    'shadow-[0_4px_16px_-2px_rgba(255,210,74,0.45)]',
    'enabled:hover:bg-gold-dark',
    LIFT,
  ].join(' '),
};

const SIZES: Record<Size, string> = {
  sm: 'px-3.5 py-1.5 text-sm rounded-lg',
  md: 'px-5 py-2.5 text-sm rounded-xl',
  lg: 'px-6 py-3.5 text-base rounded-xl',
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
