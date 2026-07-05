import { useEffect, useMemo, useRef, useState } from 'react';
import { PLAYERS } from '../../data/players';
import {
  scoutCatalog,
  scoutCategoryById,
  resolveScoutPlayer,
  suggestScoutPlayers,
  type ScoutCategory,
} from '../../lib/scout/categories';
import {
  startScoutRound,
  probeRule,
  accuseRule,
  consistentCategories,
  canProbe,
  otherSide,
  SCOUT_MAX_PROBES,
  type ScoutRound,
  type ScoutSide,
  type ScoutProbe,
} from '../../lib/scout/engine';
import { cpuPickSecret, cpuChooseAction } from '../../lib/scout/cpu';
import {
  dailyScoutCategory,
  getScoutProgress,
  hasPlayedDailyScoutToday,
  recordScoutDaily,
  recordScoutDuel,
  buildScoutDailyShareText,
  buildScoutDuelShareText,
  SCOUT_DAILY_MAX_ACCUSATIONS,
} from '../../lib/scout/daily';
import { play } from '../../lib/sound';
import { refreshAchievements } from '../../lib/achievements';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { IconBack, IconArrowRight, IconBolt, IconCheck, IconClose } from '../ui/icons';
import { ModeHeroBanner } from '../dashboard/ModeHeroBanner';
import { modeTheme } from '../dashboard/modeTheme';
import { ScoutOnlineGame } from './ScoutOnlineGame';
import { isAblyConfigured } from '../../lib/realtimeConfig';

type DuelKind = 'cpu' | 'hotseat';
type Stage =
  | { name: 'lobby' }
  | { name: 'daily' }
  | { name: 'online' }
  | { name: 'setup'; kind: DuelKind; picking: 'A' | 'B'; secretA?: string }
  | { name: 'duel'; kind: DuelKind; round: ScoutRound };

const CPU_THINK_MS = 1100;
const PLAYER_SIDE: ScoutSide = 'A'; // the human (or Player 1) always sits at A

/**
 * "The Scout" — a football deduction duel. Your opponent is a Director of
 * Football with a secret recruitment rule; probe transfer targets ("fits our
 * profile" / "not our type") and deduce the rule before they crack yours.
 * Daily solo rule + vs CPU + pass-and-play; pure engine in lib/scout.
 */
export function ScoutGame({ daily = false, onExit }: { daily?: boolean; onExit: () => void }) {
  const [stage, setStage] = useState<Stage>(daily ? { name: 'daily' } : { name: 'lobby' });
  const catalog = useMemo(() => scoutCatalog(), []);

  if (stage.name === 'daily') {
    return <DailyScout catalog={catalog} onExit={onExit} onLobby={daily ? onExit : () => setStage({ name: 'lobby' })} />;
  }
  if (stage.name === 'online') {
    return <ScoutOnlineGame name={scoutPlayerName()} onExit={() => setStage({ name: 'lobby' })} />;
  }
  if (stage.name === 'setup') {
    return (
      <SecretSetup
        key={stage.picking} // remount per picker so the hot-seat privacy gate re-arms
        catalog={catalog}
        kind={stage.kind}
        picking={stage.picking}
        onBack={() => setStage({ name: 'lobby' })}
        onPick={(id) => {
          if (stage.kind === 'cpu') {
            const cpuSecret = cpuPickSecret(catalog, () => Math.random());
            setStage({ name: 'duel', kind: 'cpu', round: startScoutRound(id, cpuSecret, PLAYER_SIDE) });
          } else if (stage.picking === 'A') {
            setStage({ name: 'setup', kind: 'hotseat', picking: 'B', secretA: id });
          } else {
            setStage({ name: 'duel', kind: 'hotseat', round: startScoutRound(stage.secretA!, id, PLAYER_SIDE) });
          }
        }}
      />
    );
  }
  if (stage.name === 'duel') {
    return (
      <ScoutDuel
        catalog={catalog}
        kind={stage.kind}
        round={stage.round}
        setRound={(round) => setStage({ name: 'duel', kind: stage.kind, round })}
        onRematch={() => setStage({ name: 'setup', kind: stage.kind, picking: 'A' })}
        onExit={onExit}
      />
    );
  }

  return (
    <ScoutLobby
      onExit={onExit}
      onDaily={() => setStage({ name: 'daily' })}
      onDuel={(kind) => setStage({ name: 'setup', kind, picking: 'A' })}
      onOnline={() => setStage({ name: 'online' })}
    />
  );
}

/** The player's saved display name (or a friendly default) for online play. */
function scoutPlayerName(): string {
  try {
    return (localStorage.getItem('bk_name') || '').trim() || 'Scout';
  } catch {
    return 'Scout';
  }
}

/* ------------------------------------------------------------------ */
/* Lobby                                                               */
/* ------------------------------------------------------------------ */

function ScoutLobby({
  onExit,
  onDaily,
  onDuel,
  onOnline,
}: {
  onExit: () => void;
  onDaily: () => void;
  onDuel: (kind: DuelKind) => void;
  onOnline: () => void;
}) {
  const progress = useMemo(() => getScoutProgress(), []);
  const dailyDone = hasPlayedDailyScoutToday(progress);
  return (
    <div className="flex flex-1 flex-col gap-4 py-4 animate-fade-in">
      <ModeHeroBanner theme={modeTheme('scout')!} onBack={onExit} />

      <div className="flex flex-col gap-2">
        <Card className="flex items-center justify-between gap-3 p-4">
          <div>
            <div className="text-sm font-bold text-white">Daily rule</div>
            <p className="nums text-xs text-white/55">
              {dailyDone
                ? `Done today${progress.daily.streak > 0 ? ` · 🔥 ${progress.daily.streak}-day streak` : ''}`
                : progress.daily.streak > 0
                  ? `🔥 ${progress.daily.streak}-day streak on the line`
                  : 'One secret rule a day — crack it in the fewest probes'}
            </p>
          </div>
          <Button size="sm" variant={dailyDone ? 'secondary' : 'primary'} onClick={onDaily}>
            {dailyDone ? 'View' : 'Play'} <IconArrowRight className="h-4 w-4" />
          </Button>
        </Card>
        <Card className="flex items-center justify-between gap-3 p-4">
          <div>
            <div className="text-sm font-bold text-white">Vs CPU</div>
            <p className="nums text-xs text-white/55">
              {progress.duelsPlayed > 0 ? `Record ${progress.duelsWon}–${progress.duelsPlayed - progress.duelsWon}` : 'Duel a scheming AI director'}
            </p>
          </div>
          <Button size="sm" onClick={() => onDuel('cpu')}>
            Play <IconArrowRight className="h-4 w-4" />
          </Button>
        </Card>
        {isAblyConfigured && (
          <Card className="flex items-center justify-between gap-3 p-4">
            <div>
              <div className="flex items-center gap-1.5 text-sm font-bold text-white">
                Play a friend online <Badge tone="pitch">1v1</Badge>
              </div>
              <p className="text-xs text-white/55">Cross-device duel with a room code</p>
            </div>
            <Button size="sm" onClick={onOnline}>
              🌐 Play <IconArrowRight className="h-4 w-4" />
            </Button>
          </Card>
        )}
        <Card className="flex items-center justify-between gap-3 p-4">
          <div>
            <div className="text-sm font-bold text-white">Pass &amp; play</div>
            <p className="text-xs text-white/55">Two managers, one device</p>
          </div>
          <Button size="sm" variant="secondary" onClick={() => onDuel('hotseat')}>
            Play <IconArrowRight className="h-4 w-4" />
          </Button>
        </Card>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Shared pieces                                                       */
/* ------------------------------------------------------------------ */

export function EvidenceRow({ probe }: { probe: ScoutProbe }) {
  return (
    <li
      className={[
        'flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs',
        probe.fits ? 'border-pitch/25 bg-pitch/[0.06] text-white/85' : 'border-white/10 bg-white/[0.03] text-white/65',
      ].join(' ')}
    >
      {probe.fits ? <IconCheck className="h-3.5 w-3.5 shrink-0 text-pitch" /> : <IconClose className="h-3.5 w-3.5 shrink-0 text-danger" />}
      <span className="min-w-0 truncate">{probe.playerName}</span>
      <span className={probe.fits ? 'ml-auto shrink-0 text-[11px] font-semibold text-pitch' : 'ml-auto shrink-0 text-[11px] text-white/40'}>
        {probe.fits ? 'Fits' : 'Not our type'}
      </span>
    </li>
  );
}

/** Typed probe input with roster suggestions. */
export function ProbeInput({
  disabled,
  probedIds,
  onProbe,
}: {
  disabled?: boolean;
  probedIds: ReadonlySet<string>;
  onProbe: (playerId: string) => void;
}) {
  const [input, setInput] = useState('');
  const [miss, setMiss] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestions = useMemo(() => suggestScoutPlayers(input), [input]);

  const submit = (raw: string) => {
    const player = resolveScoutPlayer(raw);
    if (!player) {
      setMiss(`“${raw.trim()}” isn't in the scouting book — try a suggestion.`);
      return;
    }
    if (probedIds.has(player.id)) {
      setMiss(`${player.name} has already been probed.`);
      return;
    }
    setMiss(null);
    setInput('');
    onProbe(player.id);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (input.trim()) submit(input);
      }}
      className="flex flex-col gap-2"
    >
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          className="input-field flex-1"
          placeholder="Probe a player…"
          aria-label="Probe: name any footballer to test against the secret rule"
          autoComplete="off"
          spellCheck={false}
          disabled={disabled}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setMiss(null);
          }}
        />
        <Button type="submit" disabled={disabled || !input.trim()}>
          Probe
        </Button>
      </div>
      {miss && <p className="text-xs text-gold/90" role="status">{miss}</p>}
      {suggestions.length > 0 && !disabled && (
        <div className="flex flex-wrap gap-1.5" aria-label="Player suggestions">
          {suggestions.map((name) => (
            <button
              key={name}
              type="button"
              className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-white/70 transition hover:border-pitch/40 hover:text-white answer-press"
              onClick={() => submit(name)}
            >
              {name}
            </button>
          ))}
        </div>
      )}
    </form>
  );
}

/**
 * Filterable rule list used for both picking a secret and accusing. With the
 * detective panel on, rules that contradict the evidence are hidden.
 */
export function RulePicker({
  catalog,
  evidence,
  excludedIds,
  actionLabel,
  onPick,
}: {
  catalog: ScoutCategory[];
  /** Probes to reason against; omit for secret-picking (no evidence yet). */
  evidence?: ScoutProbe[];
  excludedIds?: ReadonlySet<string>;
  actionLabel: string;
  onPick: (id: string) => void;
}) {
  const [filter, setFilter] = useState('');
  // Off by default: with it on, the list auto-narrows to the one consistent
  // rule and effectively hands you the answer. It's an opt-in deduction aid.
  const [detective, setDetective] = useState(false);
  const [armedId, setArmedId] = useState<string | null>(null);

  const consistent = useMemo(
    () => (evidence ? new Set(consistentCategories(evidence, catalog, PLAYERS).map((c) => c.id)) : null),
    [evidence, catalog],
  );

  const shown = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return catalog.filter((c) => {
      if (excludedIds?.has(c.id)) return false;
      if (consistent && detective && !consistent.has(c.id)) return false;
      return q === '' || c.label.toLowerCase().includes(q);
    });
  }, [catalog, filter, detective, consistent, excludedIds]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <input
          type="text"
          className="input-field flex-1"
          placeholder="Filter rules…"
          aria-label="Filter the rule list"
          autoComplete="off"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        {consistent && (
          <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-[11px] text-white/55">
            <input type="checkbox" checked={detective} onChange={(e) => setDetective(e.target.checked)} className="accent-pitch" />
            Detective panel
          </label>
        )}
      </div>
      {consistent && detective && (
        <p className="nums text-[11px] text-white/55" role="status">
          {consistent.size} of {catalog.length} rules still match the evidence.
        </p>
      )}
      <ul className="flex max-h-56 flex-col gap-1 overflow-y-auto pr-1">
        {shown.map((c) => (
          <li key={c.id}>
            {armedId === c.id ? (
              <div className="flex items-center gap-2 rounded-lg border border-gold/40 bg-gold/10 px-2.5 py-1.5">
                <span className="min-w-0 flex-1 truncate text-xs font-semibold text-white">{c.label}</span>
                <Button size="sm" onClick={() => onPick(c.id)}>
                  {actionLabel}
                </Button>
                <button type="button" className="text-xs text-white/55 hover:text-white/85" onClick={() => setArmedId(null)}>
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-left text-xs text-white/70 transition hover:border-pitch/40 hover:text-white answer-press"
                onClick={() => setArmedId(c.id)}
              >
                <span className="min-w-0 truncate">{c.label}</span>
                <span className="shrink-0 text-[11px] text-white/40">{c.kind}</span>
              </button>
            )}
          </li>
        ))}
        {shown.length === 0 && <li className="px-2 py-3 text-center text-xs text-white/55">No rules match.</li>}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Daily                                                               */
/* ------------------------------------------------------------------ */

function DailyScout({ catalog, onExit, onLobby }: { catalog: ScoutCategory[]; onExit: () => void; onLobby: () => void }) {
  const secret = useMemo(() => dailyScoutCategory(), []);
  const [alreadyDone] = useState(() => hasPlayedDailyScoutToday());
  const [probes, setProbes] = useState<ScoutProbe[]>([]);
  const [wrong, setWrong] = useState<string[]>([]);
  const [outcome, setOutcome] = useState<'playing' | 'solved' | 'failed'>('playing');
  const [streak, setStreak] = useState(() => getScoutProgress().daily.streak);
  const [copied, setCopied] = useState(false);
  const recorded = useRef(false);

  const probedIds = useMemo(() => new Set(probes.map((p) => p.playerId)), [probes]);
  const accusationsLeft = SCOUT_DAILY_MAX_ACCUSATIONS - wrong.length;

  const finish = (solved: boolean) => {
    if (recorded.current) return;
    recorded.current = true;
    const next = recordScoutDaily(solved, probes.length);
    setStreak(next.daily.streak);
    setOutcome(solved ? 'solved' : 'failed');
    play(solved ? 'win' : 'whistle');
  };

  const share = async () => {
    const text = buildScoutDailyShareText({
      solved: outcome === 'solved',
      probes: probes.length,
      wrongAccusations: wrong.length,
      streak,
    });
    try {
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        setCopied(true);
      }
    } catch {
      /* user dismissed the share sheet */
    }
  };

  if (alreadyDone) {
    const progress = getScoutProgress();
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-5 py-10 text-center animate-fade-in">
        <div className="text-5xl" aria-hidden>🔍</div>
        <div>
          <div className="text-xs font-bold text-white/55">The Scout · Daily rule</div>
          <h1 className="mt-1 font-display text-2xl font-bold text-white">
            {progress.daily.lastSolved ? 'Cracked today’s rule' : 'Today’s rule got away'}
          </h1>
          <p className="nums mt-1 text-sm text-white/55">
            {progress.daily.streak > 0 ? `🔥 ${progress.daily.streak}-day streak` : 'A new rule drops tomorrow'}
            {progress.daily.bestProbes !== null ? ` · best crack: ${progress.daily.bestProbes} probes` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="lg" variant="secondary" onClick={onLobby}>
            <IconBack className="h-4 w-4" /> Back
          </Button>
          <Button size="lg" onClick={onExit}>
            Home <IconArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  if (outcome !== 'playing') {
    const solved = outcome === 'solved';
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-5 py-10 text-center animate-fade-in">
        <div className="text-5xl" aria-hidden>{solved ? '🕵️' : '🙈'}</div>
        <div>
          <div className="text-xs font-bold text-white/55">The Scout · Daily rule</div>
          <h1 className="mt-1 font-display text-3xl font-bold text-gradient-pitch">
            {solved ? `Cracked in ${probes.length} probe${probes.length === 1 ? '' : 's'}` : 'Case closed — unsolved'}
          </h1>
          <p className="mt-2 text-sm text-white/65">
            The rule was <span className="font-semibold text-white">{secret.label}</span>.
          </p>
          <p className="nums mt-1 text-sm text-white/55">
            {solved && streak > 0 ? `🔥 ${streak}-day streak` : 'The streak resets — new rule tomorrow'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="lg" onClick={share}>{copied ? 'Copied!' : 'Share'}</Button>
          <Button size="lg" variant="secondary" onClick={onExit}>
            Home <IconArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 py-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onExit}>
          <IconBack className="h-4 w-4" /> Quit
        </Button>
        <Badge tone="pitch">🔍 Daily rule</Badge>
      </div>

      <Card className="flex items-center justify-between p-3">
        <div className="flex items-baseline gap-1.5">
          <span className="nums font-display text-2xl font-bold text-pitch">{probes.length}</span>
          <span className="text-[11px] text-white/55">probes</span>
        </div>
        <span className="nums text-sm text-white/55">
          {accusationsLeft} accusation{accusationsLeft === 1 ? '' : 's'} left
        </span>
      </Card>

      <Card strong className="relative overflow-hidden p-4">
        <div className="relative">
          <div className="text-xs font-bold text-white/55">Today&rsquo;s secret recruitment rule</div>
          <p className="mt-1 text-sm text-white/65">
            Probe players to hear <span className="text-pitch">fits</span> / <span className="text-danger">not our type</span>, then accuse the rule.
            It&rsquo;s one of <span className="nums font-semibold text-white">{catalog.length}</span> in the book.
          </p>
        </div>
      </Card>

      <ProbeInput
        probedIds={probedIds}
        onProbe={(playerId) => {
          const player = PLAYERS.find((p) => p.id === playerId)!;
          play('click');
          setProbes((prev) => [...prev, { playerId, playerName: player.name, fits: secret.test(player) }]);
        }}
      />

      {probes.length > 0 && (
        <div>
          <div className="mb-1.5 text-[11px] font-bold text-white/55">Evidence</div>
          <ul className="flex flex-col gap-1">
            {[...probes].reverse().map((p) => (
              <EvidenceRow key={p.playerId} probe={p} />
            ))}
          </ul>
        </div>
      )}

      <Card className="p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] font-bold text-white/55">Accuse the rule</span>
          {wrong.length > 0 && <span className="text-[11px] text-danger/90">Wrong: {wrong.length}</span>}
        </div>
        <RulePicker
          catalog={catalog}
          evidence={probes}
          excludedIds={new Set(wrong)}
          actionLabel="Accuse"
          onPick={(id) => {
            if (id === secret.id) {
              play('correct');
              finish(true);
            } else {
              play('wrong');
              const nextWrong = [...wrong, id];
              setWrong(nextWrong);
              if (nextWrong.length >= SCOUT_DAILY_MAX_ACCUSATIONS) finish(false);
            }
          }}
        />
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Duel setup (secret picking, with a hot-seat handoff gate)           */
/* ------------------------------------------------------------------ */

function SecretSetup({
  catalog,
  kind,
  picking,
  onBack,
  onPick,
}: {
  catalog: ScoutCategory[];
  kind: DuelKind;
  picking: 'A' | 'B';
  onBack: () => void;
  onPick: (id: string) => void;
}) {
  const [revealed, setRevealed] = useState(kind === 'cpu');
  const who = kind === 'cpu' ? 'You' : picking === 'A' ? 'Player 1' : 'Player 2';

  if (!revealed) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center animate-fade-in">
        <div className="text-5xl" aria-hidden>🤫</div>
        <p className="max-w-xs text-sm text-white/65">
          Pass the device to <span className="font-semibold text-white">{who}</span> — they pick their secret rule in private.
        </p>
        <Button size="lg" onClick={() => setRevealed(true)}>
          I&rsquo;m {who} — show the rules
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 py-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <IconBack className="h-4 w-4" /> Back
        </Button>
        <Badge tone="pitch">🔍 {who}: pick a secret rule</Badge>
      </div>
      <Card strong className="p-4">
        <p className="text-sm text-white/65">
          Sign players by a rule only you know. Sneaky rules overlap with others — a club rule can pass for a nationality rule for a long time.
        </p>
        <div className="mt-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onPick(catalog[Math.floor(Math.random() * catalog.length)].id)}
          >
            <IconBolt className="h-4 w-4" /> Surprise me
          </Button>
        </div>
      </Card>
      <RulePicker catalog={catalog} actionLabel="Pick" onPick={onPick} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Duel                                                                */
/* ------------------------------------------------------------------ */

function ScoutDuel({
  catalog,
  kind,
  round,
  setRound,
  onRematch,
  onExit,
}: {
  catalog: ScoutCategory[];
  kind: DuelKind;
  round: ScoutRound;
  setRound: (r: ScoutRound) => void;
  onRematch: () => void;
  onExit: () => void;
}) {
  const cpuSide: ScoutSide | null = kind === 'cpu' ? otherSide(PLAYER_SIDE) : null;
  const nameOf = (side: ScoutSide) =>
    kind === 'cpu' ? (side === PLAYER_SIDE ? 'You' : 'CPU') : side === 'A' ? 'Player 1' : 'Player 2';
  const possessive = (side: ScoutSide) => (nameOf(side) === 'You' ? 'Your' : `${nameOf(side)}’s`);

  const [tab, setTab] = useState<'probe' | 'accuse'>('probe');
  const [lastNote, setLastNote] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const recorded = useRef(false);

  const acting = round.turn;
  const isCpuTurn = cpuSide !== null && acting === cpuSide && round.phase === 'playing';
  const probedByActing = useMemo(() => new Set(round.probes[acting].map((p) => p.playerId)), [round, acting]);

  // CPU turn: think briefly, then act through the same pure engine.
  useEffect(() => {
    if (!isCpuTurn) return;
    const id = setTimeout(() => {
      const action = cpuChooseAction(round, cpuSide!, catalog, PLAYERS, () => Math.random());
      if (action.type === 'probe') {
        const next = probeRule(round, cpuSide!, action.player, catalog);
        const fits = next.probes[cpuSide!][next.probes[cpuSide!].length - 1].fits;
        setLastNote(`CPU probed ${action.player.name} — ${fits ? 'fits your rule' : 'not your type'}.`);
        setRound(next);
      } else {
        const next = accuseRule(round, cpuSide!, action.categoryId, catalog);
        const label = scoutCategoryById(action.categoryId, catalog)?.label ?? action.categoryId;
        if (next.phase === 'over') {
          setLastNote(`CPU accused “${label}” — and it was right.`);
        } else {
          setLastNote(`CPU accused “${label}” — wrong! It misses a turn.`);
          play('correct');
        }
        setRound(next);
      }
    }, CPU_THINK_MS);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, isCpuTurn]);

  // Record a finished vs-CPU duel once.
  useEffect(() => {
    if (round.phase !== 'over' || kind !== 'cpu' || recorded.current) return;
    recorded.current = true;
    const won = round.winner === PLAYER_SIDE;
    recordScoutDuel(won);
    refreshAchievements();
    play(won ? 'win' : 'whistle');
  }, [round, kind]);

  if (round.phase === 'over') {
    const winner = round.winner!;
    const humanWon = kind !== 'cpu' || winner === PLAYER_SIDE;
    const share = async () => {
      const text = buildScoutDuelShareText({ won: winner === PLAYER_SIDE, probes: round.probes[winner].length });
      try {
        if (navigator.share) await navigator.share({ text });
        else {
          await navigator.clipboard.writeText(text);
          setCopied(true);
        }
      } catch {
        /* dismissed */
      }
    };
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-5 py-10 text-center animate-fade-in">
        <div className="text-5xl" aria-hidden>{humanWon ? '🏆' : '🕵️'}</div>
        <div>
          <div className="text-xs font-bold text-white/55">The Scout</div>
          <h1 className="mt-1 font-display text-3xl font-bold text-gradient-pitch">{nameOf(winner)} cracked the rule</h1>
          <p className="nums mt-1 text-sm text-white/55">
            in {round.probes[winner].length} probe{round.probes[winner].length === 1 ? '' : 's'}
          </p>
          <div className="mt-3 flex flex-col gap-1 text-sm text-white/65">
            <span>
              {possessive('A')} rule: <span className="font-semibold text-white">{scoutCategoryById(round.secrets.A, catalog)?.label}</span>
            </span>
            <span>
              {possessive('B')} rule: <span className="font-semibold text-white">{scoutCategoryById(round.secrets.B, catalog)?.label}</span>
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="lg" onClick={onRematch}>
            <IconBolt className="h-4 w-4" /> Play again
          </Button>
          {kind === 'cpu' && <Button size="lg" variant="secondary" onClick={share}>{copied ? 'Copied!' : 'Share'}</Button>}
          <Button size="lg" variant="secondary" onClick={onExit}>
            Home <IconArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  const mustAccuse = !canProbe(round, acting);
  const activeTab = mustAccuse ? 'accuse' : tab;

  return (
    <div className="flex flex-1 flex-col gap-4 py-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onExit}>
          <IconBack className="h-4 w-4" /> Quit
        </Button>
        <Badge tone="pitch">🔍 The Scout</Badge>
      </div>

      {/* Turn banner */}
      <Card className="flex items-center justify-between p-3">
        <span className="text-sm font-bold text-white">
          {isCpuTurn ? 'CPU is scouting…' : `${nameOf(acting)} to act`}
        </span>
        <span className="nums text-xs text-white/55">
          Probes {round.probes[acting].length}/{SCOUT_MAX_PROBES}
        </span>
      </Card>

      {lastNote && (
        <div role="status" className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/65 animate-fade-in">
          {lastNote}
        </div>
      )}

      {!isCpuTurn && (
        <>
          {/* Action tabs */}
          <div className="grid grid-cols-2 gap-2" role="tablist" aria-label="Choose your action">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'probe'}
              disabled={mustAccuse}
              className={[
                'rounded-xl border px-3 py-2 text-sm font-semibold transition',
                activeTab === 'probe' ? 'border-pitch/50 bg-pitch/10 text-pitch' : 'border-white/10 bg-white/[0.03] text-white/55 hover:text-white',
                mustAccuse ? 'opacity-40' : '',
              ].join(' ')}
              onClick={() => setTab('probe')}
            >
              Probe a player
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'accuse'}
              className={[
                'rounded-xl border px-3 py-2 text-sm font-semibold transition',
                activeTab === 'accuse' ? 'border-gold/50 bg-gold/10 text-gold' : 'border-white/10 bg-white/[0.03] text-white/55 hover:text-white',
              ].join(' ')}
              onClick={() => setTab('accuse')}
            >
              Accuse the rule
            </button>
          </div>
          {mustAccuse && (
            <p className="text-xs text-gold/90" role="status">Out of probes — it&rsquo;s accusations from here.</p>
          )}

          {activeTab === 'probe' ? (
            <ProbeInput
              probedIds={probedByActing}
              onProbe={(playerId) => {
                const player = PLAYERS.find((p) => p.id === playerId)!;
                play('click');
                const next = probeRule(round, acting, player, catalog);
                const fits = next.probes[acting][next.probes[acting].length - 1].fits;
                setLastNote(`${nameOf(acting)} probed ${player.name} — ${fits ? 'fits' : 'not their type'}.`);
                setRound(next);
              }}
            />
          ) : (
            <Card className="p-3">
              <p className="mb-2 text-[11px] text-white/55">A wrong accusation costs your next turn.</p>
              <RulePicker
                catalog={catalog}
                evidence={round.probes[acting]}
                excludedIds={new Set(round.accusations[acting].map((a) => a.categoryId))}
                actionLabel="Accuse"
                onPick={(id) => {
                  const next = accuseRule(round, acting, id, catalog);
                  if (next.phase === 'over') {
                    play('correct');
                  } else {
                    play('wrong');
                    const label = scoutCategoryById(id, catalog)?.label ?? id;
                    setLastNote(`${nameOf(acting)} accused “${label}” — wrong! They miss a turn.`);
                    setTab('probe');
                  }
                  setRound(next);
                }}
              />
            </Card>
          )}
        </>
      )}

      {/* Both investigations, side by side (all public information) */}
      <div className="grid grid-cols-2 gap-2">
        {(['A', 'B'] as const).map((side) => (
          <div key={side}>
            <div className="mb-1.5 flex items-center justify-between text-[11px] font-bold text-white/55">
              <span>{possessive(side)} evidence</span>
              {round.accusations[side].length > 0 && (
                <span className="normal-case text-danger/80">{round.accusations[side].length} wrong</span>
              )}
            </div>
            <ul className="flex flex-col gap-1">
              {[...round.probes[side]].reverse().map((p) => (
                <EvidenceRow key={p.playerId} probe={p} />
              ))}
              {round.probes[side].length === 0 && (
                <li className="rounded-lg border border-dashed border-white/10 px-2.5 py-2 text-center text-[11px] text-white/40">
                  No probes yet
                </li>
              )}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
