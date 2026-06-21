import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  children: ReactNode;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-pitch text-ink-900 font-semibold hover:bg-pitch-glow shadow-glow hover:shadow-glow-lg',
  secondary:
    'bg-white/10 text-white font-medium hover:bg-white/20 border border-white/15',
  ghost: 'bg-transparent text-white/80 hover:text-white hover:bg-white/5',
  danger: 'bg-danger/90 text-white font-semibold hover:bg-danger',
  gold: 'bg-gold text-ink-900 font-bold hover:bg-gold-dark shadow-gold',
};

const SIZES: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
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
        'answer-press inline-flex items-center justify-center gap-2',
        'transition-colors duration-150 select-none',
        'disabled:opacity-45 disabled:cursor-not-allowed disabled:shadow-none',
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
