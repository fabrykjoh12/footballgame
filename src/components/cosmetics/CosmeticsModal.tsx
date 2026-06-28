import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ACCENTS,
  PATTERNS,
  buildCosmeticContext,
  getSelection,
  saveSelection,
  type CosmeticSelection,
} from '../../lib/cosmetics';
import { IconClose, IconCheck } from '../ui/icons';

/** Cosmetics gallery — pick a stadium accent + pitch pattern. Body portal. */
export function CosmeticsModal({ onClose }: { onClose: () => void }) {
  const ctx = useMemo(() => buildCosmeticContext(), []);
  const [sel, setSel] = useState<CosmeticSelection>(() => getSelection());

  const choose = (patch: Partial<CosmeticSelection>) => {
    const next = saveSelection({ ...sel, ...patch });
    setSel(next);
  };

  const unlockedAccents = ACCENTS.filter((a) => a.unlocked(ctx)).length;
  const unlockedPatterns = PATTERNS.filter((p) => p.unlocked(ctx)).length;

  const body = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Cosmetics"
      className="fixed inset-0 z-[100] flex items-end justify-center bg-ink-900/80 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-white/10 bg-ink-800 p-5 shadow-elev-2 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Cosmetics</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white"
          >
            <IconClose className="h-5 w-5" />
          </button>
        </div>
        <p className="mb-4 text-xs text-white/45">
          Purely cosmetic — earned by playing. They never affect a match.
        </p>

        <h3 className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-white/45">
          <span>Stadium accent</span>
          <span className="text-white/30">
            {unlockedAccents}/{ACCENTS.length}
          </span>
        </h3>
        <div className="mb-4 grid grid-cols-2 gap-2">
          {ACCENTS.map((a) => {
            const unlocked = a.unlocked(ctx);
            const active = sel.accent === a.id;
            return (
              <button
                key={a.id}
                type="button"
                disabled={!unlocked}
                onClick={() => choose({ accent: a.id })}
                aria-pressed={active}
                className={[
                  'flex items-center gap-2 rounded-xl border px-3 py-2 text-left transition',
                  active ? 'border-pitch bg-pitch/10' : 'border-white/10 bg-white/[0.03]',
                  unlocked ? 'hover:border-white/25' : 'cursor-not-allowed opacity-50',
                ].join(' ')}
              >
                <span
                  className="h-6 w-6 shrink-0 rounded-full ring-1 ring-white/20"
                  style={{ backgroundColor: a.hex }}
                />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{a.name}</span>
                  <span className="block truncate text-[10px] text-white/45">
                    {unlocked ? (active ? 'Selected' : 'Tap to use') : `🔒 ${a.unlockLabel}`}
                  </span>
                </span>
                {active && <IconCheck className="ml-auto h-4 w-4 shrink-0 text-pitch" />}
              </button>
            );
          })}
        </div>

        <h3 className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-white/45">
          <span>Pitch pattern</span>
          <span className="text-white/30">
            {unlockedPatterns}/{PATTERNS.length}
          </span>
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {PATTERNS.map((p) => {
            const unlocked = p.unlocked(ctx);
            const active = sel.pattern === p.id;
            return (
              <button
                key={p.id}
                type="button"
                disabled={!unlocked}
                onClick={() => choose({ pattern: p.id })}
                aria-pressed={active}
                className={[
                  'rounded-xl border px-3 py-2 text-left transition',
                  active ? 'border-pitch bg-pitch/10' : 'border-white/10 bg-white/[0.03]',
                  unlocked ? 'hover:border-white/25' : 'cursor-not-allowed opacity-50',
                ].join(' ')}
              >
                <span className="block text-sm font-semibold">{p.name}</span>
                <span className="block truncate text-[10px] text-white/45">
                  {unlocked ? (active ? 'Selected' : 'Tap to use') : `🔒 ${p.unlockLabel}`}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  return createPortal(body, document.body);
}
