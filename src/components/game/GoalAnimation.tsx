import { useEffect } from 'react';
import { useGame } from '../../context/GameProvider';
import type { GameEventKind } from '../../types/game';
import { teamName } from '../../lib/teamName';

const OVERLAY_MS = 1700;

const STYLES: Record<
  GameEventKind,
  { headline: string; className: string; sub: string }
> = {
  goal: { headline: 'GOAL!', className: 'text-gradient-pitch', sub: 'scores!' },
  equalizer: { headline: 'EQUALIZER!', className: 'text-gradient-gold', sub: 'levels it!' },
  late_winner: { headline: 'LATE WINNER!', className: 'text-gradient-gold', sub: 'turns it around!' },
  hat_trick: { headline: 'HAT-TRICK!', className: 'text-gradient-pitch', sub: 'three in a row!' },
  counterattack: { headline: 'COUNTERATTACK!', className: 'text-gradient-pitch', sub: 'lightning quick!' },
};

/**
 * Full-screen transient overlay for headline football events. Shows the
 * oldest queued event, then clears it after a beat so the next can play.
 */
export function GoalAnimation() {
  const { events, clearEvent, room } = useGame();
  const current = events[0];

  useEffect(() => {
    if (!current) return;
    const t = setTimeout(() => clearEvent(current.nonce), OVERLAY_MS);
    return () => clearTimeout(t);
  }, [current, clearEvent]);

  if (!current) return null;

  const player = room?.players.find((p) => p.id === current.playerId);
  const style = STYLES[current.kind];

  return (
    <div
      className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center"
      role="status"
      aria-live="polite"
    >
      <div className="absolute inset-0 animate-fade-in bg-ink-900/55 backdrop-blur-sm" />
      <div className="relative px-6 text-center animate-goal-pop">
        {player && (
          <div className="mb-1 text-sm font-semibold uppercase tracking-[0.25em] text-white/70">
            {teamName(player.name)}
          </div>
        )}
        <div
          className={[
            'font-display text-6xl font-bold sm:text-8xl drop-shadow-[0_0_30px_rgba(22,255,122,0.5)]',
            style.className,
          ].join(' ')}
        >
          {style.headline}
        </div>
        <div className="mt-1 text-base text-white/70">{style.sub}</div>
      </div>
    </div>
  );
}
