import type { LucideIcon } from 'lucide-react';

/** A single sidebar row: icon + label, with an elegant active state. */
export function SidebarItem({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={[
        'group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-all duration-200 ease-premium',
        active
          ? 'border border-royal/25 bg-gradient-to-r from-royal/[0.16] to-royal/[0.04] font-semibold text-bone shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]'
          : 'border border-transparent font-medium text-bone-dim hover:bg-white/[0.04] hover:text-bone',
      ].join(' ')}
    >
      {active && (
        <span aria-hidden className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-royal" />
      )}
      <Icon
        className={active ? 'h-[18px] w-[18px] text-royal' : 'h-[18px] w-[18px] text-bone-faint group-hover:text-bone-dim'}
        strokeWidth={2.2}
      />
      <span className="truncate">{label}</span>
    </button>
  );
}
