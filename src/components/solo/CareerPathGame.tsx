import { useEffect, useMemo, useRef, useState } from 'react';
import {
  careerPathPool,
  pickCareerPlayer,
  matchesPlayer,
  suggestPlayerNames,
  careerPathPoints,
  getCareerPathProgress,
  recordCareerPathResult,
} from '../../lib/careerPath';
import type { Player } from '../../lib/playerDb';
import { play } from '../../lib/sound';
import { teamIdentity } from '../../lib/teamIdentity';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { IconBack, IconArrowRight, IconBolt, IconCheck, IconClose, IconRoute } from '../ui/icons';

const REVEAL_MS = 2200;

/**
 * "Career Path" — guess the player from their clubs. Clubs reveal one at a time
 * (fewer seen = more points); a wrong guess or giving up ends the run.
 * Self-contained; reads the central player DB, no match engine.
 */
export function CareerPathGame({ onExit }: { onExit: () => void }) {
  const pool = useMemo(() => careerPathPool(3), []);
  const rng = useRef(() => Math.random());

  const [player, setPlayer] = useState<Player | null>(() => pickCareerPlayer(pool, rng.current));
  const [revealed, setRevealed] = useState(1);
  const [streak, setStreak] = useState(0);
  const [score, setScore] = useState(0);
  const [input, setInput] = useState('');
  const [phase, setPhase] = useState<'guess' | 'reveal' | 'over'>('guess');
  const [lastCorrect, setLastCorrect] = useState(false);
  const [best, setBest] = useState(() => getCareerPathProgress().bestStreak);
  const recorded = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = useMemo(
    () => (phase === 'guess' ? suggestPlayerNames(input) : []),
    [input, phase],
  );

  useEffect(() => {
    if (phase === 'guess') inputRef.current?.focus();
  }, [phase, player]);

  const nextPlayer = () => {
    const next = pickCareerPlayer(pool, rng.current, player ? [player.id] : []);
    if (!next) {
      setPhase('over');
      return;
    }
    setPlayer(next);
    setRevealed(1);
    setInput('');
    setPhase('guess');
  };

  const submit = () => {
    if (phase !== 'guess' || !player) return;
    const correct = matchesPlayer(input, player);
    setLastCorrect(correct);
    play(correct ? 'correct' : 'wrong');
    if (correct) {
      setScore((s) => s + careerPathPoints(revealed, player.clubs.length));
      setStreak((s) => s + 1);
    }
    setPhase('reveal');
  };

  const giveUp = () => {
    if (phase !== 'guess') return;
    setLastCorrect(false);
    play('wrong');
    setPhase('reveal');
  };

  // After the reveal: advance on a correct guess, else end the run.
  useEffect(() => {
    if (phase !== 'reveal') return;
    const id = setTimeout(() => {
      if (lastCorrect) nextPlayer();
      else setPhase('over');
    }, REVEAL_MS);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, lastCorrect]);

  // Record the finished run once.
  useEffect(() => {
    if (phase !== 'over' || recorded.current) return;
    recorded.current = true;
    const { progress, isBest } = recordCareerPathResult(streak, score);
    setBest(progress.bestStreak);
    play(isBest && score > 0 ? 'win' : 'whistle');
  }, [phase, streak, score]);

  if (phase === 'over') {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-5 py-10 text-center animate-fade-in">
        <div className="text-5xl" aria-hidden>🧭</div>
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-white/40">Career Path</div>
          <h1 className="nums mt-1 font-display text-3xl font-bold text-gradient-pitch">{streak} solved</h1>
          <p className="nums mt-1 text-sm text-white/55">{score.toLocaleString()} pts · best streak {best}</p>
        </div>
        <div className="flex gap-2">
          <Button
            size="lg"
            onClick={() => {
              recorded.current = false;
              setStreak(0);
              setScore(0);
              setPlayer(pickCareerPlayer(pool, rng.current));
              setRevealed(1);
              setInput('');
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

  if (!player) {
    return <div className="flex flex-1 items-center justify-center py-20 text-white/50">No players available.</div>;
  }

  const total = player.clubs.length;
  const revealing = phase === 'reveal';
  const showAll = revealing;

  return (
    <div className="flex flex-1 flex-col gap-4 py-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onExit}>
          <IconBack className="h-4 w-4" /> Quit
        </Button>
        <Badge tone="pitch"><IconRoute className="h-4 w-4" /> Career Path</Badge>
      </div>

      {/* HUD */}
      <Card className="flex items-center justify-between p-3">
        <div className="flex items-baseline gap-1.5">
          <span className="nums font-display text-2xl font-bold text-pitch">{score.toLocaleString()}</span>
          <span className="text-[11px] uppercase tracking-wide text-white/40">pts</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {streak >= 2 && (
            <span className="nums inline-flex items-center gap-1 font-semibold text-gold"><IconBolt className="h-4 w-4" /> {streak}</span>
          )}
          <span className="nums text-white/55">Best {best}</span>
        </div>
      </Card>

      {/* Club chain */}
      <Card strong className="relative overflow-hidden p-4">
        <div className="grid-tactical pointer-events-none absolute inset-0 opacity-[0.3]" aria-hidden />
        <div className="relative">
        <div className="mb-2 text-center text-xs uppercase tracking-wide text-white/40">Which player is this?</div>
        <ol className="flex flex-col gap-1.5">
          {player.clubs.map((club, i) => {
            const shown = showAll || i < revealed;
            const kit = teamIdentity(club);
            return (
              <li key={i} className="flex items-center gap-2">
                <span className="nums w-5 text-right text-xs text-white/30">{i + 1}</span>
                <span
                  className={[
                    'flex flex-1 items-center gap-2 rounded-lg border px-3 py-2 font-display font-bold',
                    shown ? 'border-white/10 bg-white/[0.05] text-white/90' : 'border-dashed border-white/10 bg-white/[0.02] text-white/25',
                  ].join(' ')}
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: shown ? kit.color : 'rgba(255,255,255,0.15)' }}
                    aria-hidden
                  />
                  {shown ? club : '• • •'}
                </span>
              </li>
            );
          })}
        </ol>
        {!revealing && revealed < total && (
          <button
            onClick={() => setRevealed((r) => Math.min(total, r + 1))}
            className="mt-2 w-full rounded-lg border border-white/10 bg-white/[0.03] py-1.5 text-xs text-white/55 transition hover:text-white answer-press"
          >
            Reveal next club (−points)
          </button>
        )}
        </div>
      </Card>

      {/* Reveal banner */}
      {revealing && (
        <div
          role="status"
          className={[
            'rounded-xl border px-3 py-2 text-sm font-semibold animate-scale-in',
            lastCorrect ? 'border-pitch/40 bg-pitch/10 text-pitch' : 'border-danger/40 bg-danger/10 text-danger',
          ].join(' ')}
        >
          <div className="flex items-center gap-2">
            {lastCorrect ? <IconCheck className="h-4 w-4" /> : <IconClose className="h-4 w-4" />}
            <span>{lastCorrect ? 'Correct!' : 'It was'} {player.name}</span>
          </div>
        </div>
      )}

      {/* Guess input */}
      {!revealing && (
        <form
          onSubmit={(e) => { e.preventDefault(); submit(); }}
          className="flex flex-col gap-2"
        >
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              className="input-field flex-1"
              placeholder="Name the player…"
              aria-label="Your answer: name the player"
              autoComplete="off"
              spellCheck={false}
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <Button type="submit" disabled={!input.trim()}>Guess</Button>
          </div>
          {suggestions.length > 0 && (
            <div className="flex flex-wrap gap-1.5" role="listbox" aria-label="Name suggestions">
              {suggestions.map((name) => (
                <button
                  key={name}
                  type="button"
                  role="option"
                  aria-selected={false}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/75 transition hover:border-pitch/40 hover:text-white answer-press"
                  onClick={() => { setInput(name); inputRef.current?.focus(); }}
                >
                  {name}
                </button>
              ))}
            </div>
          )}
          <button type="button" onClick={giveUp} className="self-center text-[11px] text-white/35 hover:text-white/60">
            Give up
          </button>
        </form>
      )}
    </div>
  );
}
