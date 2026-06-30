import { useEffect, useMemo, useRef, useState } from 'react';
import {
  pickManagerRound,
  matchesManagerPair,
  managersForClubPair,
  suggestManagerNames,
  getManagerProgress,
  recordManagerResult,
  type ManagerRound,
} from '../../lib/managers';
import { play } from '../../lib/sound';
import { matchIdentities, type TeamIdentity } from '../../lib/teamIdentity';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { IconBack, IconArrowRight, IconBolt, IconCheck, IconClose, IconUsers } from '../ui/icons';

const REVEAL_MS = 2400;

/**
 * "Manager Merry-go-round" — name a manager who managed BOTH shown clubs.
 * Typed survival: keep the streak alive; a wrong guess or give-up ends it.
 * Self-contained over the managers dataset; no match engine.
 */
export function ManagerMerryGoRound({ onExit }: { onExit: () => void }) {
  const rng = useRef(() => Math.random());
  const recentKeys = useRef<string[]>([]);

  const firstRound = useMemo(() => pickManagerRound(rng.current), []);
  const [round, setRound] = useState<ManagerRound | null>(firstRound);
  const [streak, setStreak] = useState(0);
  const [input, setInput] = useState('');
  const [phase, setPhase] = useState<'guess' | 'reveal' | 'over'>('guess');
  const [lastCorrect, setLastCorrect] = useState(false);
  const [best, setBest] = useState(() => getManagerProgress().bestStreak);
  const recorded = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = useMemo(
    () => (phase === 'guess' ? suggestManagerNames(input) : []),
    [input, phase],
  );

  useEffect(() => {
    if (phase === 'guess') inputRef.current?.focus();
  }, [phase, round]);

  const advance = () => {
    if (round) recentKeys.current = [`${round.clubA}|${round.clubB}`, ...recentKeys.current].slice(0, 10);
    const next = pickManagerRound(rng.current, undefined, recentKeys.current);
    setRound(next);
    setInput('');
    setPhase('guess');
  };

  const resolve = (correct: boolean) => {
    setLastCorrect(correct);
    play(correct ? 'correct' : 'wrong');
    if (correct) setStreak((s) => s + 1);
    setPhase('reveal');
  };

  const submit = () => {
    if (phase !== 'guess' || !round) return;
    resolve(matchesManagerPair(input, round.clubA, round.clubB));
  };

  useEffect(() => {
    if (phase !== 'reveal') return;
    const id = setTimeout(() => {
      if (lastCorrect) advance();
      else setPhase('over');
    }, REVEAL_MS);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, lastCorrect]);

  useEffect(() => {
    if (phase !== 'over' || recorded.current) return;
    recorded.current = true;
    const { progress, isBest } = recordManagerResult(streak);
    setBest(progress.bestStreak);
    play(isBest && streak > 0 ? 'win' : 'whistle');
  }, [phase, streak]);

  if (phase === 'over') {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-5 py-10 text-center animate-fade-in">
        <div className="text-5xl" aria-hidden>🎩</div>
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-white/40">Manager Merry-go-round</div>
          <h1 className="nums mt-1 font-display text-3xl font-bold text-gradient-pitch">{streak} in a row</h1>
          <p className="nums mt-1 text-sm text-white/55">Best streak {best}</p>
        </div>
        <div className="flex gap-2">
          <Button
            size="lg"
            onClick={() => {
              recorded.current = false;
              recentKeys.current = [];
              setStreak(0);
              setInput('');
              setRound(pickManagerRound(rng.current));
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
    return <div className="flex flex-1 items-center justify-center py-20 text-white/50">No managers available.</div>;
  }

  const revealing = phase === 'reveal';
  const answers = revealing ? managersForClubPair(round.clubA, round.clubB).map((m) => m.name) : [];

  return (
    <div className="flex flex-1 flex-col gap-4 py-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onExit}>
          <IconBack className="h-4 w-4" /> Quit
        </Button>
        <Badge tone="pitch"><IconUsers className="h-4 w-4" /> Manager Merry-go-round</Badge>
      </div>

      {/* HUD */}
      <Card className="flex items-center justify-between p-3">
        <div className="flex items-baseline gap-1.5">
          <span className="nums font-display text-2xl font-bold text-pitch">{streak}</span>
          <span className="text-[11px] uppercase tracking-wide text-white/40">streak</span>
        </div>
        <span className="nums text-sm text-white/55">Best {best}</span>
      </Card>

      {/* The two clubs */}
      <Card strong className="relative overflow-hidden p-5 text-center">
        <div className="grid-tactical pointer-events-none absolute inset-0 opacity-[0.3]" aria-hidden />
        <div className="relative">
          <div className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-white/45">
            Name a manager who managed both
          </div>
          {(() => {
            const [idA, idB] = matchIdentities(round.clubA, round.clubB);
            return (
              <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-1">
                <ManagerClubChip name={round.clubA} identity={idA} />
                <ManagerConnector />
                <ManagerClubChip name={round.clubB} identity={idB} />
              </div>
            );
          })()}
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
            <span>{lastCorrect ? 'Correct!' : 'Nope'}</span>
          </div>
          <p className="mt-1 font-normal text-white/75">
            Accepted: <span className="font-semibold text-white/90">{answers.join(', ')}</span>
          </p>
        </div>
      )}

      {/* Guess input */}
      {!revealing && (
        <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              className="input-field flex-1"
              placeholder="Name a manager…"
              aria-label="Your answer: a manager who managed both clubs"
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
          <button type="button" onClick={() => resolve(false)} className="self-center text-[11px] text-white/35 hover:text-white/60">
            Give up
          </button>
        </form>
      )}
    </div>
  );
}

function ManagerClubChip({ name, identity }: { name: string; identity: TeamIdentity }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-2">
      <span
        className="grid h-12 w-12 shrink-0 place-items-center rounded-xl font-display text-lg font-black"
        style={{ backgroundColor: identity.soft, color: identity.color, boxShadow: `inset 0 0 0 2px ${identity.ring}` }}
        aria-hidden
      >
        {name.charAt(0).toUpperCase()}
      </span>
      <span className="text-balance font-display text-sm font-bold leading-tight text-white/90">{name}</span>
    </div>
  );
}

/** The manager who links the two clubs. */
function ManagerConnector() {
  return (
    <div className="flex items-center pt-3">
      <span className="h-px w-2 bg-white/15 sm:w-3" aria-hidden />
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-pitch/40 bg-pitch/10 text-sm">
        🎩
      </span>
      <span className="h-px w-2 bg-white/15 sm:w-3" aria-hidden />
    </div>
  );
}
