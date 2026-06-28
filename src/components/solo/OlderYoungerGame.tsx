import { useEffect, useMemo, useRef, useState } from 'react';
import {
  olderYoungerPool,
  judgeGuess,
  pickPlayer,
  startOYRound,
  getOYProgress,
  recordOYResult,
  type Guess,
  type OYRound,
} from '../../lib/olderYounger';
import { play } from '../../lib/sound';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { IconBack, IconArrowRight, IconBolt, IconCheck, IconClose, IconScale } from '../ui/icons';

const REVEAL_MS = 1600;

function lastClub(clubs: string[]): string {
  return clubs[clubs.length - 1] ?? '';
}

/**
 * "Older or Younger?" — a Higher/Lower survival mode on player birth years.
 * Self-contained: own state + best-streak storage, no match engine.
 */
export function OlderYoungerGame({ onExit }: { onExit: () => void }) {
  const pool = useMemo(() => olderYoungerPool(), []);
  const rng = useRef(() => Math.random());

  const [round, setRound] = useState<OYRound | null>(() => startOYRound(pool, rng.current));
  const [streak, setStreak] = useState(0);
  const [phase, setPhase] = useState<'guess' | 'reveal' | 'over'>('guess');
  const [lastCorrect, setLastCorrect] = useState(false);
  const [best, setBest] = useState(() => getOYProgress().bestStreak);
  const recorded = useRef(false);

  const guess = (g: Guess) => {
    if (phase !== 'guess' || !round) return;
    const correct = judgeGuess(round.current.birthYear!, round.next.birthYear!, g);
    setLastCorrect(correct);
    play(correct ? 'correct' : 'wrong');
    if (correct) setStreak((s) => s + 1);
    setPhase('reveal');
  };

  // After the reveal: carry the challenger over (if correct) or end the run.
  useEffect(() => {
    if (phase !== 'reveal' || !round) return;
    const id = setTimeout(() => {
      if (!lastCorrect) {
        setPhase('over');
        return;
      }
      const nextChallenger = pickPlayer(pool, rng.current, [round.next.id]);
      if (!nextChallenger) {
        setPhase('over');
        return;
      }
      setRound({ current: round.next, next: nextChallenger });
      setPhase('guess');
    }, REVEAL_MS);
    return () => clearTimeout(id);
  }, [phase, lastCorrect, round, pool]);

  // Record the finished run once.
  useEffect(() => {
    if (phase !== 'over' || recorded.current) return;
    recorded.current = true;
    const { progress, isBest } = recordOYResult(streak);
    setBest(progress.bestStreak);
    play(isBest && streak > 0 ? 'win' : 'whistle');
  }, [phase, streak]);

  if (phase === 'over') {
    const isBest = streak >= best && streak > 0;
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-5 py-10 text-center animate-fade-in">
        <div className="text-5xl" aria-hidden>🎂</div>
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-white/40">Older or Younger?</div>
          <h1 className="mt-1 font-display text-3xl font-bold text-gradient-pitch">{streak} in a row</h1>
          {isBest && (
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-sm font-semibold text-gold">
              🏆 New best!
            </div>
          )}
        </div>
        <Card className="w-full max-w-xs p-4">
          <div className="grid grid-cols-2 gap-2">
            <Stat label="This run" value={String(streak)} />
            <Stat label="Best" value={String(best)} />
          </div>
        </Card>
        <div className="flex gap-2">
          <Button
            size="lg"
            onClick={() => {
              recorded.current = false;
              setStreak(0);
              setLastCorrect(false);
              setRound(startOYRound(pool, rng.current));
              setPhase('guess');
            }}
          >
            <IconBolt className="h-4 w-4" /> Play again
          </Button>
          <Button size="lg" variant="secondary" onClick={onExit}>
            Home <IconArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  if (!round) {
    return (
      <div className="flex flex-1 items-center justify-center py-20 text-white/50">
        Not enough players with birth years yet.
      </div>
    );
  }

  const revealing = phase === 'reveal';

  return (
    <div className="flex flex-1 flex-col gap-4 py-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onExit}>
          <IconBack className="h-4 w-4" /> Quit
        </Button>
        <Badge tone="pitch"><IconScale className="h-4 w-4" /> Older or Younger?</Badge>
      </div>

      {/* HUD */}
      <Card className="flex items-center justify-between p-3">
        <div className="flex items-baseline gap-1.5">
          <span className="font-display text-2xl font-bold text-pitch">{streak}</span>
          <span className="text-[11px] uppercase tracking-wide text-white/40">streak</span>
        </div>
        <span className="text-sm text-white/55">Best {best}</span>
      </Card>

      {/* The known player */}
      <PlayerCard name={round.current.name} club={lastClub(round.current.clubs)} year={round.current.birthYear!} />

      {/* Reveal / prompt */}
      {revealing ? (
        <div
          role="status"
          className={[
            'rounded-xl border px-3 py-2 text-center text-sm font-semibold animate-scale-in',
            lastCorrect ? 'border-pitch/40 bg-pitch/10 text-pitch' : 'border-danger/40 bg-danger/10 text-danger',
          ].join(' ')}
        >
          <span className="inline-flex items-center gap-2">
            {lastCorrect ? <IconCheck className="h-4 w-4" /> : <IconClose className="h-4 w-4" />}
            {lastCorrect ? 'Correct!' : 'Wrong!'}
          </span>
        </div>
      ) : (
        <p className="text-center text-xs uppercase tracking-wide text-white/40">Is the next player older or younger?</p>
      )}

      {/* The challenger */}
      <PlayerCard
        name={round.next.name}
        club={lastClub(round.next.clubs)}
        year={revealing ? round.next.birthYear! : null}
      />

      {/* Guess buttons */}
      <div className="grid grid-cols-2 gap-2">
        <Button fullWidth disabled={revealing} onClick={() => guess('older')}>⬆️ Older</Button>
        <Button fullWidth variant="secondary" disabled={revealing} onClick={() => guess('younger')}>⬇️ Younger</Button>
      </div>
    </div>
  );
}

function PlayerCard({ name, club, year }: { name: string; club: string; year: number | null }) {
  return (
    <Card strong className="flex items-center justify-between p-4">
      <div>
        <div className="font-display text-lg font-bold">{name}</div>
        {club && <div className="text-xs text-white/45">{club}</div>}
      </div>
      <div className="text-right">
        <div className="text-[10px] uppercase tracking-wide text-white/40">Born</div>
        <div className="font-display text-2xl font-bold text-pitch">{year ?? '????'}</div>
      </div>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/[0.03] p-2 text-center">
      <div className="font-display text-xl font-bold">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-white/40">{label}</div>
    </div>
  );
}
