import { useState } from 'react';
import { SOLO_MODE_LIST, type SoloMode } from '../../lib/soloModes';
import { getSoloProgress, bestForMode } from '../../lib/soloProgress';
import { SoloGame } from './SoloGame';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { IconBack, IconArrowRight } from '../ui/icons';

/** Singleplayer arcade hub: pick a mode, see your bests, play. */
export function GameModesHub({ onExit }: { onExit: () => void }) {
  const [mode, setMode] = useState<SoloMode | null>(null);
  // Re-read bests whenever we return to the list (a run may have set a new one).
  const [progress, setProgress] = useState(() => getSoloProgress());

  if (mode) {
    return (
      <SoloGame
        mode={mode}
        onExit={() => {
          setProgress(getSoloProgress());
          setMode(null);
        }}
      />
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-5 py-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onExit}>
          <IconBack className="h-4 w-4" /> Home
        </Button>
      </div>

      <div className="text-center">
        <h1 className="font-display text-3xl font-bold tracking-tight">
          <span className="text-gradient-pitch">Game Modes</span>
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-balance text-sm text-white/55">
          Solo challenges against the clock and the question bank. Your best scores
          are saved on this device.
        </p>
      </div>

      <div className="mx-auto flex w-full max-w-md flex-col gap-3">
        {SOLO_MODE_LIST.map((m) => {
          const best = bestForMode(progress, m.id);
          const bestLabel =
            m.id === 'survival'
              ? best > 0
                ? `Best: ${best} survived`
                : 'Not played yet'
              : best > 0
                ? `Best: ${best.toLocaleString()} pts`
                : 'Not played yet';
          return (
            <Card key={m.id} className="p-4">
              <div className="flex items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-pitch/15 text-2xl ring-1 ring-pitch/30">
                  <span aria-hidden>{m.icon}</span>
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-display text-lg font-bold">{m.label}</h2>
                    <span className="shrink-0 text-[11px] font-semibold text-gold">{bestLabel}</span>
                  </div>
                  <p className="mt-0.5 text-xs leading-relaxed text-white/55">{m.description}</p>
                </div>
              </div>
              <div className="mt-3">
                <Button fullWidth onClick={() => setMode(m.id)}>
                  Play {m.label} <IconArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {progress.gauntletPerfect && (
        <p className="text-center text-xs text-gold">🧗 You’ve cleared a Perfect Gauntlet — legendary.</p>
      )}
    </div>
  );
}
