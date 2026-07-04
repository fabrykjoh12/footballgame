import { ChevronRight } from 'lucide-react';
import type { ModeMeta } from './modes';

const KIND_STYLE: Record<ModeMeta['kind'], string> = {
  Versus: 'text-brand-blue bg-brand-blue/12 border-brand-blue/25',
  Solo: 'text-bone-dim bg-white/[0.06] border-white/10',
  Daily: 'text-gold bg-gold/12 border-gold/25',
  Cup: 'text-gold bg-gold/12 border-gold/25',
};

/**
 * A polished game-mode card: a colour-tinted icon plate, title + kind chip,
 * one-line description, and a hover-lift with an arrow affordance.
 */
export function GameModeCard({
  mode,
  onClick,
  badge,
}: {
  mode: ModeMeta;
  onClick: () => void;
  /** Optional status override (e.g. "Continue", "Done"). */
  badge?: string;
}) {
  const Icon = mode.icon;
  return (
    <button
      onClick={onClick}
      className="lift group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-white/[0.07] bg-ink-800 p-4 text-left"
    >
      {/* faint accent wash from the mode's identity colour */}
      <span
        aria-hidden
        className="pointer-events-none absolute -left-8 -top-10 h-28 w-28 rounded-full opacity-20 blur-2xl transition-opacity duration-200 group-hover:opacity-30"
        style={{ backgroundColor: mode.accent }}
      />
      <span
        className="relative grid h-12 w-12 shrink-0 place-items-center rounded-xl border"
        style={{
          backgroundColor: `${mode.accent}1f`,
          borderColor: `${mode.accent}40`,
          color: mode.accent,
        }}
      >
        <Icon className="h-6 w-6" strokeWidth={2.1} />
      </span>

      <span className="relative min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-[17px] font-bold text-bone">{mode.label}</span>
          <span
            className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
              badge ? 'border-royal/30 bg-royal/12 text-royal' : KIND_STYLE[mode.kind]
            }`}
          >
            {badge ?? mode.kind}
          </span>
        </span>
        <span className="mt-1 block truncate text-[13px] text-bone-dim">{mode.sub}</span>
      </span>

      <ChevronRight
        className="relative h-5 w-5 shrink-0 text-bone-faint transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-bone-dim"
        strokeWidth={2.2}
      />
    </button>
  );
}
