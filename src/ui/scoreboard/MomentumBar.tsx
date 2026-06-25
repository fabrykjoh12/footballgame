import type { QuestionResult, Side } from '../../types/match.ts';

/**
 * A football-style momentum bar: recent questions tilt the bar toward whichever
 * side has been scoring. Pure derivation from results — no extra state.
 */
export function MomentumBar({
  results,
  playerSide,
}: {
  results: readonly QuestionResult[];
  playerSide: Side;
}) {
  const recent = results.slice(-4);
  let homeWeight = 1;
  let awayWeight = 1;
  for (const r of recent) {
    const playerGoals = r.playerGoals + (r.player.correct ? 0.5 : 0);
    const oppGoals = r.opponentGoals + (r.opponent.correct ? 0.5 : 0);
    if (playerSide === 'home') {
      homeWeight += playerGoals;
      awayWeight += oppGoals;
    } else {
      homeWeight += oppGoals;
      awayWeight += playerGoals;
    }
  }
  const total = homeWeight + awayWeight;
  const homePct = Math.round((homeWeight / total) * 100);

  return (
    <div className="flex items-center gap-2" aria-hidden="true">
      <span className="text-[10px] uppercase tracking-wide text-ink-muted">Momentum</span>
      <div className="flex h-1.5 flex-1 overflow-hidden rounded-full">
        <div
          className="h-full bg-team-home transition-[width] duration-700"
          style={{ width: `${homePct}%` }}
        />
        <div
          className="h-full flex-1 bg-team-away transition-[width] duration-700"
        />
      </div>
    </div>
  );
}
