import {
  computeStandings,
  PROMOTION_SPOTS,
  RELEGATION_SPOTS,
  TEAMS_PER_DIVISION,
  TOP_TIER,
  BOTTOM_TIER,
  type CareerState,
} from '../../lib/career';
import { teamName } from '../../lib/teamName';
import { teamIdentity } from '../../lib/teamIdentity';

/**
 * League table for the current division. Promotion places glow pitch-green,
 * relegation places fade red — your row is highlighted.
 */
export function LeagueTable({ state }: { state: CareerState }) {
  const rows = computeStandings(state);
  const showPromotion = state.tier > TOP_TIER;
  const showRelegation = state.tier < BOTTOM_TIER;
  const relegationFrom = TEAMS_PER_DIVISION - RELEGATION_SPOTS;

  return (
    <div className="overflow-hidden rounded-xl border border-white/10">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-white/[0.04] text-[10px] uppercase tracking-wide text-white/40">
            <th className="py-2 pl-3 text-left font-semibold">#</th>
            <th className="py-2 text-left font-semibold">Club</th>
            <th className="py-2 text-center font-semibold">P</th>
            <th className="hidden py-2 text-center font-semibold sm:table-cell">W</th>
            <th className="hidden py-2 text-center font-semibold sm:table-cell">D</th>
            <th className="hidden py-2 text-center font-semibold sm:table-cell">L</th>
            <th className="py-2 text-center font-semibold">GD</th>
            <th className="py-2 pr-3 text-center font-semibold">Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const pos = i + 1;
            const inPromotion = showPromotion && pos <= PROMOTION_SPOTS;
            const inRelegation = showRelegation && pos > relegationFrom;
            const kit = teamIdentity(row.team.name);
            return (
              <tr
                key={row.team.id}
                className={[
                  'border-t border-white/5',
                  row.team.isYou ? 'bg-pitch/10' : 'odd:bg-white/[0.02]',
                ].join(' ')}
              >
                <td className="relative py-2 pl-3 text-left font-mono text-white/50">
                  <span
                    aria-hidden
                    className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r"
                    style={{
                      backgroundColor: inPromotion
                        ? '#16ff7a'
                        : inRelegation
                          ? '#ff4d5e'
                          : 'transparent',
                    }}
                  />
                  {pos}
                </td>
                <td className="py-2">
                  <div className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: kit.color }}
                    />
                    <span
                      className={[
                        'truncate',
                        row.team.isYou ? 'font-bold text-pitch' : 'text-white/85',
                      ].join(' ')}
                    >
                      {teamName(row.team.name)}
                    </span>
                  </div>
                </td>
                <td className="py-2 text-center text-white/60">{row.played}</td>
                <td className="hidden py-2 text-center text-white/60 sm:table-cell">
                  {row.won}
                </td>
                <td className="hidden py-2 text-center text-white/60 sm:table-cell">
                  {row.drawn}
                </td>
                <td className="hidden py-2 text-center text-white/60 sm:table-cell">
                  {row.lost}
                </td>
                <td className="py-2 text-center font-mono text-white/60">
                  {row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff}
                </td>
                <td className="py-2 pr-3 text-center font-mono font-bold text-white">
                  {row.points}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {(showPromotion || showRelegation) && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 bg-white/[0.02] px-3 py-2 text-[10px] text-white/40">
          {showPromotion && (
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-pitch" /> Promotion
            </span>
          )}
          {showRelegation && (
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-danger" /> Relegation
            </span>
          )}
        </div>
      )}
    </div>
  );
}
