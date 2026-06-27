import { useGame } from '../../context/GameProvider';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { teamName } from '../../lib/teamName';
import {
  CUPS,
  getCup,
  getCupSave,
  beginCup,
  currentRound,
  roundSettings,
} from '../../lib/cup';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { IconBack, IconTrophy, IconArrowRight } from '../ui/icons';

/** Hub for themed Cup Runs: resume an active run, pick a cup, see your trophies. */
export function CupHub({ onExit }: { onExit: () => void }) {
  const { playCareer } = useGame();
  const [name] = useLocalStorage('bk_name', '');
  const save = getCupSave();
  const player = name.trim() || 'You';

  const active = save.active && save.active.status === 'playing' ? save.active : null;
  const activeDef = active ? getCup(active.cupId) : undefined;
  const activeRound = active && activeDef ? currentRound(active, activeDef) : null;

  const startCup = (cupId: string) => {
    const def = getCup(cupId);
    if (!def) return;
    beginCup(cupId);
    void playCareer(player, def.rounds[0].opponent, roundSettings(def.rounds[0]));
  };

  const resume = () => {
    if (!activeRound) return;
    void playCareer(player, activeRound.opponent, roundSettings(activeRound));
  };

  return (
    <div className="flex flex-1 flex-col gap-5 py-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onExit}>
          <IconBack className="h-4 w-4" /> Home
        </Button>
        {save.trophies.length > 0 && (
          <Badge tone="gold">
            🏆 {save.trophies.length} cup{save.trophies.length === 1 ? '' : 's'} won
          </Badge>
        )}
      </div>

      <div className="text-center">
        <h1 className="font-display text-3xl font-bold tracking-tight">
          <span className="text-gradient-pitch">Cup Runs</span>
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-balance text-sm text-white/55">
          Themed knockout tournaments vs the CPU. Win every tie to lift the trophy —
          lose one and you’re out.
        </p>
      </div>

      {/* Resume an in-progress run */}
      {active && activeDef && activeRound && (
        <Card strong className="mx-auto w-full max-w-md p-4 animate-rise-in">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-xl" aria-hidden>
              {activeDef.emoji}
            </span>
            <h2 className="font-display text-lg font-bold">{activeDef.name}</h2>
            <span className="ml-auto text-xs font-semibold text-gold">In progress</span>
          </div>
          <p className="text-xs text-white/55">
            {activeRound.name} vs{' '}
            <span className="font-semibold text-white/80">{teamName(activeRound.opponent)}</span>
          </p>
          <div className="mt-3">
            <Button fullWidth onClick={resume}>
              Continue run <IconArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {/* Cup list */}
      <div className="mx-auto flex w-full max-w-md flex-col gap-3">
        {CUPS.map((cup) => {
          const won = save.trophies.includes(cup.id);
          return (
            <Card key={cup.id} className={['p-4', won ? 'border-gold/30' : ''].join(' ')}>
              <div className="flex items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-pitch/15 text-2xl ring-1 ring-pitch/30">
                  <span aria-hidden>{cup.emoji}</span>
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-display text-lg font-bold">{cup.name}</h2>
                    {won && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-gold">
                        <IconTrophy className="h-3.5 w-3.5" /> Won
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs leading-relaxed text-white/55">{cup.blurb}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <Badge tone="muted">{cup.rounds.length} ties</Badge>
                    <Badge tone="muted">Final: {teamName(cup.rounds[cup.rounds.length - 1].opponent)}</Badge>
                  </div>
                </div>
              </div>
              <div className="mt-3">
                <Button
                  fullWidth
                  variant={won ? 'secondary' : 'primary'}
                  disabled={!!active && active.cupId !== cup.id}
                  onClick={() => startCup(cup.id)}
                >
                  {won ? 'Win it again' : `Enter the ${cup.name}`}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {active && (
        <p className="text-center text-[11px] text-white/40">
          Finish or quit your current run to start a different cup.
        </p>
      )}
    </div>
  );
}
