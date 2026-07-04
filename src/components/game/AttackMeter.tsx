import { attackState } from '../../lib/attackMeter';
import type { TeamIdentity } from '../../lib/teamIdentity';
import { IconFlame } from '../ui/icons';

/**
 * The live attack meter — a thin, kit-coloured bar under a team on the
 * scoreboard that fills as they build toward their next goal, with a broadcast
 * phase label (Possession → Building pressure → Dangerous attack → Shooting
 * chance). Purely a view over the score, so it can't disagree with the result.
 */
export function AttackMeter({
  score,
  streak,
  identity,
  align,
}: {
  score: number;
  streak: number;
  identity: TeamIdentity;
  align: 'left' | 'right';
}) {
  const s = attackState(score, streak);
  const right = align === 'right';
  const pct = Math.round(s.fill * 100);
  const imminent = s.phase === 'shot' || s.phase === 'max';

  return (
    <div className={right ? 'text-right' : 'text-left'}>
      <div
        className={[
          'mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide',
          right ? 'justify-end' : 'justify-start',
        ].join(' ')}
        style={{ color: imminent ? identity.color : undefined }}
      >
        {!right && s.surging && <IconFlame className="h-3 w-3 text-gold" />}
        <span className={imminent ? '' : 'text-white/50'}>{s.label}</span>
        {right && s.surging && <IconFlame className="h-3 w-3 text-gold" />}
      </div>
      <div
        className={[
          'relative h-1.5 overflow-hidden rounded-full bg-white/[0.08]',
          imminent ? 'motion-safe:animate-pulse' : '',
        ].join(' ')}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Attack: ${s.label}`}
      >
        <div
          className={['absolute inset-y-0 rounded-full transition-[width] duration-500 ease-out', right ? 'right-0' : 'left-0'].join(' ')}
          style={{
            width: `${pct}%`,
            background: `linear-gradient(${right ? '270deg' : '90deg'}, ${identity.color}, ${identity.color}cc)`,
            boxShadow: imminent ? `0 0 10px ${identity.ring}` : undefined,
          }}
        />
      </div>
    </div>
  );
}
