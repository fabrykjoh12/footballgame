import type { ReactNode } from 'react';
import { ModeMotif } from './ModeMotif';
import type { ModeTheme } from './modeTheme';

/**
 * The shared mode hero — one shape, themed per mode. Layered accent gradient +
 * a code-drawn motif (or optional artwork) + emblem, kicker, title, tagline,
 * and an optional right-hand slot. Art-ready: pass `theme.image` to swap the
 * motif for generated artwork.
 *
 * `compact` renders a slim one-row header for modes that begin play immediately
 * (no separate lobby) — same identity, a fraction of the height so it never
 * crowds an active, timed screen.
 */
export function ModeHeroBanner({
  theme,
  onBack,
  right,
  children,
  compact = false,
}: {
  theme: ModeTheme;
  onBack?: () => void;
  right?: ReactNode;
  children?: ReactNode;
  compact?: boolean;
}) {
  const Emblem = theme.emblem;

  const BackArrow = (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  if (compact) {
    return (
      <div className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-ink-800">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background: `radial-gradient(120% 200% at 0% 50%, ${theme.accent}20, transparent 60%)`,
          }}
        />
        <div className="relative flex items-center gap-3 px-3 py-2.5">
          {onBack && (
            <button
              onClick={onBack}
              aria-label="Back"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-bone-dim transition-colors hover:bg-white/5 hover:text-bone"
            >
              {BackArrow}
            </button>
          )}
          <span
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border"
            style={{ backgroundColor: `${theme.accent}1f`, borderColor: `${theme.accent}45`, color: theme.accent }}
          >
            <Emblem className="h-5 w-5" strokeWidth={2.1} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: theme.accent }}>
              {theme.eyebrow}
            </div>
            <div className="truncate text-lg font-extrabold leading-tight tracking-tight text-bone">{theme.title}</div>
          </div>
          {right && <div className="shrink-0">{right}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-ink-800">
      {/* Accent gradient wash */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background: `radial-gradient(120% 140% at 0% 0%, ${theme.accent}26, transparent 55%), radial-gradient(120% 160% at 100% 100%, ${theme.accent2}1c, transparent 60%)`,
        }}
      />
      {/* Motif or artwork */}
      {theme.image ? (
        <img src={theme.image} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover opacity-40" />
      ) : (
        <div className="absolute inset-0 opacity-[0.5]">
          <ModeMotif motif={theme.motif} color={theme.accent} />
        </div>
      )}
      {/* Left-to-right legibility scrim */}
      <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-ink-900/85 via-ink-900/40 to-transparent" />

      <div className="relative p-5 sm:p-6">
        {onBack && (
          <button
            onClick={onBack}
            className="mb-4 inline-flex items-center gap-1.5 text-sm text-bone-dim transition-colors hover:text-bone"
          >
            {BackArrow}
            Back
          </button>
        )}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <span
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border"
                style={{ backgroundColor: `${theme.accent}1f`, borderColor: `${theme.accent}45`, color: theme.accent }}
              >
                <Emblem className="h-6 w-6" strokeWidth={2.1} />
              </span>
              <div className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: theme.accent }}>
                {theme.eyebrow}
              </div>
            </div>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-bone sm:text-[34px]">{theme.title}</h1>
            <p className="mt-2 max-w-lg text-[14px] leading-relaxed text-bone-dim">{theme.tagline}</p>
          </div>
          {right && <div className="shrink-0">{right}</div>}
        </div>
        {children && <div className="mt-4">{children}</div>}
      </div>
    </div>
  );
}
