import { useEffect, useRef, useState } from 'react';
import type { AblyRondoService } from '../../services/ablyRondoService';
import type { ConnectionState } from '../../types/game';
import type { RondoSyncState } from '../../lib/rondo/online';
import { sideOf } from '../../lib/rondo/online';
import { rallyTally, otherRondoSide, type RondoSide } from '../../lib/rondo/engine';
import { scoutCategoryById, resolveScoutPlayer, suggestScoutPlayers } from '../../lib/scout/categories';
import { PLAYERS } from '../../data/players';
import { recordRondoDuel } from '../../lib/rondo/daily';
import { refreshAchievements } from '../../lib/achievements';
import { play } from '../../lib/sound';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { SuggestInput } from '../ui/SuggestInput';
import { IconBack, IconBolt, IconArrowRight, IconCheck } from '../ui/icons';

type Phase = 'menu' | 'connecting' | 'playing' | 'error';

/**
 * Online 1v1 for Rondo (host-authoritative via AblyRondoService). A shared rule
 * appears; the two sides take turns naming players who fit it, synced across
 * devices, with a host-authoritative turn clock. No secrets, so the whole state
 * syncs directly. Local vs-CPU / pass-and-play / daily are untouched; the Ably
 * SDK is lazy-loaded here.
 */
export function RondoOnlineGame({ name, onExit }: { name: string; onExit: () => void }) {
  const serviceRef = useRef<AblyRondoService | null>(null);
  const [phase, setPhase] = useState<Phase>('menu');
  const [code, setCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [state, setState] = useState<RondoSyncState | null>(null);
  const [conn, setConn] = useState<ConnectionState>('connected');
  const [err, setErr] = useState('');

  useEffect(() => {
    return () => {
      void serviceRef.current?.leave();
      serviceRef.current = null;
    };
  }, []);

  // Record the finished match once per device (its own win/loss).
  const recordedRef = useRef<string | null>(null);
  useEffect(() => {
    const match = state?.match;
    const svc = serviceRef.current;
    if (!match || match.phase !== 'over' || !svc) return;
    const key = `${state?.rallyIndex}`;
    if (recordedRef.current === key) return;
    const mySide = state ? sideOf(state, svc.getLocalPlayerId()) : null;
    if (!mySide) return;
    recordedRef.current = key;
    const won = match.winner === mySide;
    recordRondoDuel(won);
    refreshAchievements();
    play(won ? 'win' : 'wrong');
  }, [state?.match?.phase, state]);

  const begin = async (mode: 'create' | 'join') => {
    setPhase('connecting');
    setErr('');
    const { AblyRondoService } = await import('../../services/ablyRondoService');
    const svc = new AblyRondoService();
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
          <Badge tone="pitch">⚽ Rondo · Online</Badge>
          <p className="mx-auto mt-3 max-w-md text-sm text-white/65">
            Duel a friend across devices. A shared rule appears — take turns naming
            players who fit it. Lose the ball and you concede.
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
  const oppSide = mySide ? otherRondoSide(mySide) : null;
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
      <Badge tone="pitch">⚽ Online · {code}</Badge>
    </div>
  );

  /* --------------------- waiting for the opponent --------------------- */
  if (state.players.length < 2 || !state.match || !mySide || !oppSide) {
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

  const match = state.match;
  const nameOf = (side: RondoSide) =>
    side === mySide ? 'You' : state.players.find((p) => p.side === side)?.name ?? 'Opponent';

  /* ---------------------------- match over ---------------------------- */
  if (match.phase === 'over') {
    const iWon = match.winner === mySide;
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-5 py-10 text-center animate-fade-in">
        <div className="text-5xl" aria-hidden>{iWon ? '🏆' : '⚽'}</div>
        <div>
          <div className="text-xs font-bold text-white/55">Rondo · Online</div>
          <h1 className="mt-1 font-display text-3xl font-bold text-gradient-pitch">
            {iWon ? 'You kept possession!' : 'Passed off the park'}
          </h1>
          <p className="nums mt-2 text-3xl font-black">
            {match.scores[mySide]} <span className="text-white/40">–</span> {match.scores[oppSide]}
          </p>
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
  return (
    <div className="flex flex-1 flex-col gap-3 py-4 animate-fade-in">
      {header}
      {banner}

      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2.5">
        <Score label={nameOf('A')} value={match.scores.A} active={match.rally.turn === 'A'} />
        <span className="text-[10px] font-semibold uppercase tracking-wide text-white/40">
          Rally {match.rallyNumber} · first to {match.target}
        </span>
        <Score label={nameOf('B')} value={match.scores.B} active={match.rally.turn === 'B'} right />
      </div>

      <RondoRule state={state} match={match} mySide={mySide} svc={svc} nameOf={nameOf} />
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Score({ label, value, active, right }: { label: string; value: number; active: boolean; right?: boolean }) {
  return (
    <div className={`flex min-w-0 flex-col ${right ? 'items-end' : 'items-start'}`}>
      <span className={`max-w-[8rem] truncate text-[11px] font-semibold ${active ? 'text-pitch' : 'text-white/50'}`}>{label}</span>
      <span className="nums text-xl font-black">{value}</span>
    </div>
  );
}

function RondoRule({
  state,
  match,
  mySide,
  svc,
  nameOf,
}: {
  state: RondoSyncState;
  match: NonNullable<RondoSyncState['match']>;
  mySide: RondoSide;
  svc: AblyRondoService;
  nameOf: (s: RondoSide) => string;
}) {
  const category = scoutCategoryById(match.rally.categoryId);
  const myTurn = match.rally.turn === mySide;
  const tally = rallyTally(match.rally);

  // Host-authoritative countdown derived from the deadline; on expiry the local
  // player nudges a timeout (the host also has a fallback timer).
  const [now, setNow] = useState(() => Date.now());
  const timedOutFor = useRef<number | null>(null);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);
  const deadline = state.turnDeadline;
  const remaining = deadline == null ? 0 : Math.max(0, Math.ceil((deadline - now) / 1000));
  useEffect(() => {
    if (myTurn && deadline != null && now >= deadline && timedOutFor.current !== deadline) {
      timedOutFor.current = deadline;
      svc.timeout();
    }
  }, [myTurn, deadline, now, svc]);

  return (
    <>
      <Card className="p-4 text-center">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-white/45">Name a player who…</div>
        <div className="mt-0.5 font-display text-lg font-bold text-pitch">{category?.label ?? '…'}</div>
        <div className="mt-1 text-[11px] text-white/45">
          {tally.A + tally.B} named this rally · {nameOf(match.rally.turn)} to name
        </div>
      </Card>

      {myTurn ? (
        <div>
          <SuggestInput
            key={`${match.rallyNumber}-${match.rally.named.length}`}
            suggest={rondoSuggest}
            onCommit={(raw) => {
              const player = resolveScoutPlayer(raw, PLAYERS);
              if (!player) return 'No player found — check the spelling.';
              play('click');
              svc.name(player.id);
              return null;
            }}
            placeholder="Name a player"
            submitIcon={<IconCheck className="h-4 w-4" />}
            submitLabel="Submit name"
            listId="rondo-online-name"
          />
          <div className={`mt-1 text-right text-[11px] font-semibold ${remaining <= 5 ? 'text-danger' : 'text-white/40'}`}>
            {remaining}s
          </div>
        </div>
      ) : (
        <div role="status" className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-6 text-center text-sm text-white/55">
          {nameOf(match.rally.turn)} is naming… {remaining}s
        </div>
      )}

      {match.rally.named.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {match.rally.named.map((n, i) => (
            <span
              key={i}
              className={[
                'rounded-full px-2.5 py-1 text-[11px] font-medium',
                n.side === mySide ? 'bg-pitch/15 text-pitch' : 'bg-rose-500/15 text-rose-300',
              ].join(' ')}
            >
              {n.playerName}
            </span>
          ))}
        </div>
      )}
    </>
  );
}

const rondoSuggest = (q: string) => suggestScoutPlayers(q, 5);
