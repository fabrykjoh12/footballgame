import type { LucideIcon } from 'lucide-react';

type Tone = 'default' | 'green' | 'gold';

const TONES: Record<Tone, string> = {
  default: 'text-bone-dim',
  green: 'text-royal',
  gold: 'text-gold',
};

/** A compact figure chip: icon + value + label — for the top bar / stat rows. */
export function StatPill({
  icon: Icon,
  value,
  label,
  tone = 'default',
}: {
  icon?: LucideIcon;
  value: string;
  label?: string;
  tone?: Tone;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {Icon && <Icon className={`h-4 w-4 ${TONES[tone]}`} strokeWidth={2.2} />}
      <span className="nums text-sm font-bold text-bone">{value}</span>
      {label && <span className="text-xs text-bone-faint">{label}</span>}
    </div>
  );
}
