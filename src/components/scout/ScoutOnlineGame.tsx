import { useEffect, useMemo, useRef, useState } from 'react';
import type { AblyScoutService } from '../../services/ablyScoutService';
import type { ConnectionState } from '../../types/game';
import type { ScoutSyncState } from '../../lib/scout/online';
import { sideOf } from '../../lib/scout/online';
import { canProbe, SCOUT_MAX_PROBES, otherSide, type ScoutSide } from '../../lib/scout/engine';
import { scoutCatalog, scoutCategoryById } from '../../lib/scout/categories';
import { recordScoutDuel } from '../../lib/scout/daily';
import { refreshAchievements } from '../../lib/achievements';
import { play } from '../../lib/sound';
import { EvidenceRow, ProbeInput, RulePicker } from './ScoutGame';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { IconBack, IconBolt, IconArrowRight } from '../ui/icons';

type Phase = 'menu' | 'connecting' | 'playing' | 'error';

/**
 * Online 1v1 for The Scout (host-authoritative via AblyScoutService). Both
 * sides secretly lock a rule; probes and accusations sync across devices and
 * each player's secret stays hidden until the round is decided. Local vs-CPU /
 * pass-and-play is untouched; the Ably SDK is lazy-loaded here.
 */
export function ScoutOnlineGame({ name, onExit }: { name: string; onExit: () => void }) {
  const serviceRef = useRef<AblyScoutService | null>(null);
  const catalog = useMemo(() => scoutCatalog(), []);
  const [phase, setPhase] = useState<Phase>('menu');
  const [code, setCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [state, setState] = useState<ScoutSyncState | null>(null);
  const [conn, setConn] = useState<ConnectionState>('connected');
  const [err, setErr] = useState('');
  const [tab, setTab] = useState<'probe' | 'accuse'>('probe');

  useEffect(() => {
    return () => {
      void serviceRef.current?.leave();
      serviceRef.current = null;
    };
  }, []);

  // Record the online duel's result once per round (each device logs its own
  // win/loss), then refresh achievements — same records as the local duel.
  const recordedRef = useRef(false);
  useEffect(() => {
    const round = state?.round;
    if (!round || round.phase !== 'over') {
      recordedRef.current = false;
      return;
    }
    if (recordedRef.current) return;
    const svc = serviceRef.current;
    const mySide = svc && state ? sideOf(state, svc.getLocalPlayerId()) : null;
    if (!mySide) return;
    recordedRef.current = true;
    const won = round.winner === mySide;
    recordScoutDuel(won);
    refreshAchievements();
    play(won ? 'win' : 'whistle');
  }, [state?.round?.phase, state]);

  const begin = async (mode: 'create' | 'join') => {
    setPhase('connecting');
    setErr('');
    const { AblyScoutService } = await import('../../services/ablyScoutService');
    const svc = new AblyScoutService();
    serviceRef.current = svc;
    svc.onState(setState);
    svc.onConnectionState(setConn);
    try {
      if (mode === 'create') {
        setCode(await svc.createRoom(name));
      } else {
        await svc.joinRoom(joinCode, name);
        setCode(svc.getRoomCode());
      }
      setPhase('playing');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not connect.');
      setPhase('error');
    }
  };

  const svc = serviceRef.current;
  const localId = svc?.getLocalPlayerId() ?? '';

  /* ------------------------------- menu ------------------------------- */
  if (phase === 'menu' || phase === 'error') {
    return (
      <div className="flex flex-col gap-4 py-4 animate-fade-in">
        <button onClick={onExit} className="inline-flex items-center gap-1.5 self-start text-sm text-white/55 hover:text-white">
          <IconBack className="h-4 w-4" /> Back
        </button>
        <div className="text-center">
          <Badge tone="pitch">🔍 The Scout · Online</Badge>
          <p className="mx-auto mt-3 max-w-md text-sm text-white/65">
            Duel a friend across devices. Both hide a secret recruitment rule; take
            turns probing players and deduce theirs before they crack yours.
          </p>
        </div>
        {err && <p className="text-center text-sm text-danger">{err}</p>}
        <Card className="flex flex-col gap-3 p-4">
          <Button size="lg" fullWidth onClick={() => begin('create')}>
            <IconBolt className="h-4 w-4" /> Create a duel
          </Button>
          <div className="flex items-center gap-2">
            <input
              className="input-field flex-1"
              placeholder="Enter code…"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              aria-label="Duel code"
            />
            <Button variant="secondary" disabled={joinCode.trim().length < 5} onClick={() => begin('join')}>
              Join
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  /* ---------------------------- connecting ---------------------------- */
  if (phase === 'connecting' || !state || !svc) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-20 text-center animate-fade-in">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-pitch" />
        {code ? (
          <div>
            <p className="text-sm text-white/65">Share this code with your friend:</p>
            <p className="nums mt-1 font-display text-3xl font-bold tracking-[0.3em] text-pitch">{code}</p>
            <p className="mt-2 text-xs text-white/55">Waiting for them to join…</p>
          </div>
        ) : (
          <p className="text-sm text-white/65">Connecting…</p>
        )}
        <Button variant="ghost" size="sm" onClick={onExit}>
          <IconBack className="h-4 w-4" /> Leave
        </Button>
      </div>
    );
  }

  const mySide = sideOf(state, localId);
  const oppSide = mySide ? otherSide(mySide) : null;
  const round = state.round;
  const banner =
    conn !== 'connected' ? (
      <div role="status" className="rounded-lg border border-gold/30 bg-gold/10 px-3 py-2 text-center text-sm text-gold">
        {conn === 'reconnecting' ? 'Reconnecting…' : 'Connection lost — trying to recover.'}
      </div>
    ) : null;

  const header = (
    <div className="flex items-center justify-between">
      <Button variant="ghost" size="sm" onClick={onExit}>
        <IconBack className="h-4 w-4" /> Quit
      </Button>
      <Badge tone="pitch">🔍 Online · {code}</Badge>
    </div>
  );

  /* --------------------- waiting for the opponent --------------------- */
  if (state.players.length < 2) {
    return (
      <div className="flex flex-col gap-4 py-4 animate-fade-in">
        {header}
        {banner}
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-pitch" />
          <p className="text-sm text-white/65">Share the code to bring in your opponent:</p>
          <p className="nums font-display text-3xl font-bold tracking-[0.3em] text-pitch">{code}</p>
        </div>
      </div>
    );
  }

  /* ----------------------- pick your secret rule ---------------------- */
  if (mySide && !state.locked[mySide]) {
    return (
      <div className="flex flex-col gap-4 py-4 animate-fade-in">
        {header}
        {banner}
        <Card strong className="p-4">
          <h2 className="font-display text-lg font-bold text-gradient-pitch">Choose your secret rule</h2>
          <p className="mt-1 text-sm text-white/65">
            Your opponent will probe players trying to deduce it. Pick one they&rsquo;ll struggle to read.
          </p>
        </Card>
        <Card className="p-3">
          <RulePicker catalog={catalog} actionLabel="Lock in" onPick={(id) => { play('click'); svc.lock(id); }} />
        </Card>
      </div>
    );
  }

  /* ------------------- waiting for opponent to lock ------------------- */
  if (!round) {
    return (
      <div className="flex flex-col gap-4 py-4 animate-fade-in">
        {header}
        {banner}
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="text-4xl" aria-hidden>🔒</div>
          <p className="text-sm text-white/65">Your rule is locked in.</p>
          <p className="text-xs text-white/45">Waiting for your opponent to choose theirs…</p>
        </div>
      </div>
    );
  }

  /* ---------------------------- round over ---------------------------- */
  if (round.phase === 'over' && mySide && oppSide) {
    const iWon = round.winner === mySide;
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-5 py-10 text-center animate-fade-in">
        <div className="text-5xl" aria-hidden>{iWon ? '🏆' : '🕵️'}</div>
        <div>
          <div className="text-xs font-bold text-white/55">The Scout · Online</div>
          <h1 className="mt-1 font-display text-3xl font-bold text-gradient-pitch">
            {iWon ? 'You cracked the rule!' : 'Your opponent got there first'}
          </h1>
          <p className="nums mt-1 text-sm text-white/55">
            in {round.probes[round.winner ?? mySide].length} probe
            {round.probes[round.winner ?? mySide].length === 1 ? '' : 's'}
          </p>
          <div className="mt-3 flex flex-col gap-1 text-sm text-white/65">
            <span>Your rule: <span className="font-semibold text-white">{scoutCategoryById(round.secrets[mySide], catalog)?.label}</span></span>
            <span>Their rule: <span className="font-semibold text-white">{scoutCategoryById(round.secrets[oppSide], catalog)?.label}</span></span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="lg" onClick={() => svc.rematch()}>
            <IconBolt className="h-4 w-4" /> Rematch
          </Button>
          <Button size="lg" variant="secondary" onClick={onExit}>
            Home <IconArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  /* ------------------------------ the duel ---------------------------- */
  if (!mySide || !oppSide) return null;
  const myTurn = round.turn === mySide;
  const probedByMe = new Set(round.probes[mySide].map((p) => p.playerId));
  const mustAccuse = !canProbe(round, mySide);
  const activeTab = mustAccuse ? 'accuse' : tab;
  const myRuleLabel = scoutCategoryById(round.secrets[mySide], catalog)?.label;

  return (
    <div className="flex flex-1 flex-col gap-4 py-4 animate-fade-in">
      {header}
      {banner}

      {/* Turn + your protected rule */}
      <Card className="flex items-center justify-between p-3">
        <span className="text-sm font-bold text-white">{myTurn ? 'Your move' : 'Opponent scouting…'}</span>
        <span className="nums text-xs text-white/55">Probes {round.probes[mySide].length}/{SCOUT_MAX_PROBES}</span>
      </Card>
      {myRuleLabel && (
        <p className="text-center text-[11px] text-white/45">
          Your protected rule: <span className="font-semibold text-white/70">{myRuleLabel}</span>
        </p>
      )}

      {myTurn ? (
        <>
          <div className="grid grid-cols-2 gap-2" role="tablist" aria-label="Choose your action">
            <button
              type="button" role="tab" aria-selected={activeTab === 'probe'} disabled={mustAccuse}
              className={['rounded-xl border px-3 py-2 text-sm font-semibold transition',
                activeTab === 'probe' ? 'border-pitch/50 bg-pitch/10 text-pitch' : 'border-white/10 bg-white/[0.03] text-white/55 hover:text-white',
                mustAccuse ? 'opacity-40' : ''].join(' ')}
              onClick={() => setTab('probe')}
            >
              Probe a player
            </button>
            <button
              type="button" role="tab" aria-selected={activeTab === 'accuse'}
              className={['rounded-xl border px-3 py-2 text-sm font-semibold transition',
                activeTab === 'accuse' ? 'border-gold/50 bg-gold/10 text-gold' : 'border-white/10 bg-white/[0.03] text-white/55 hover:text-white'].join(' ')}
              onClick={() => setTab('accuse')}
            >
              Accuse the rule
            </button>
          </div>
          {mustAccuse && <p className="text-xs text-gold/90" role="status">Out of probes — it&rsquo;s accusations from here.</p>}

          {activeTab === 'probe' ? (
            <ProbeInput probedIds={probedByMe} onProbe={(playerId) => { play('click'); svc.probe(playerId); }} />
          ) : (
            <Card className="p-3">
              <p className="mb-2 text-[11px] text-white/55">A wrong accusation costs your next turn.</p>
              <RulePicker
                catalog={catalog}
                excludedIds={new Set(round.accusations[mySide].map((a) => a.categoryId))}
                actionLabel="Accuse"
                onPick={(id) => { play('click'); svc.accuse(id); setTab('probe'); }}
              />
            </Card>
          )}
        </>
      ) : (
        <div role="status" className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-6 text-center text-sm text-white/55 animate-fade-in">
          Waiting for your opponent to make their move…
        </div>
      )}

      {/* Both investigations (public) */}
      <div className="grid grid-cols-2 gap-2">
        {([mySide, oppSide] as ScoutSide[]).map((side, i) => (
          <div key={side}>
            <div className="mb-1.5 flex items-center justify-between text-[11px] font-bold text-white/55">
              <span>{i === 0 ? 'Your evidence' : 'Their evidence'}</span>
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
