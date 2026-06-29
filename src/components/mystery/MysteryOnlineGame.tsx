import { useEffect, useRef, useState } from 'react';
import type { AblyMysteryService } from '../../services/ablyMysteryService';
import { currentCandidates, opponentOf } from '../../lib/mysteryPlayer/mysteryPlayerEngine';
import { questionLabel } from '../../lib/mysteryPlayer/mysteryPlayerQuestions';
import { mysteryPlayerById } from '../../data/mysteryPlayers';
import type { ConnectionState } from '../../types/game';
import type { MysteryState, RoomSettings, VerifiedQuestion } from '../../lib/mysteryPlayer/mysteryPlayerTypes';
import { PlayerSearch } from './PlayerSearch';
import { QuestionBuilder } from './QuestionBuilder';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { IconBack, IconBolt, IconShare } from '../ui/icons';

type Phase = 'menu' | 'connecting' | 'playing' | 'error';

/**
 * Online 1v1 Mystery Player Duel (host-authoritative via AblyMysteryService).
 * Self-contained so local hot-seat / CPU play is untouched. Answers are manual
 * (the service forces it) and secrets are redacted on the wire.
 */
export function MysteryOnlineGame({
  settings,
  name,
  onExit,
}: {
  settings: RoomSettings;
  name: string;
  onExit: () => void;
}) {
  const serviceRef = useRef<AblyMysteryService | null>(null);
  const [phase, setPhase] = useState<Phase>('menu');
  const [code, setCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [state, setState] = useState<MysteryState | null>(null);
  const [conn, setConn] = useState<ConnectionState>('connected');
  const [err, setErr] = useState('');
  const [builder, setBuilder] = useState(false);
  const [guessing, setGuessing] = useState(false);

  useEffect(() => {
    return () => {
      void serviceRef.current?.leave();
      serviceRef.current = null;
    };
  }, []);

  const begin = async (mode: 'create' | 'join') => {
    setPhase('connecting');
    setErr('');
    // Lazy-load the Ably-backed service so the SDK never ships with local play.
    const { AblyMysteryService } = await import('../../services/ablyMysteryService');
    const svc = new AblyMysteryService();
    serviceRef.current = svc;
    svc.onState(setState);
    svc.onConnectionState(setConn);
    try {
      if (mode === 'create') {
        const c = await svc.createRoom(name, settings);
        setCode(c);
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

  /* ----------------------------- menu ----------------------------- */
  if (phase === 'menu' || phase === 'error') {
    return (
      <div className="flex flex-col gap-4 py-4 animate-fade-in">
        <button onClick={onExit} className="inline-flex items-center gap-1.5 self-start text-sm text-white/50 hover:text-white">
          <IconBack className="h-4 w-4" /> Back
        </button>
        <div className="text-center">
          <Badge tone="gold">🕵️ Mystery Duel · Online</Badge>
          <p className="mx-auto mt-3 max-w-md text-sm text-white/60">
            Play a friend across devices. Both pick a secret player; take turns asking
            yes/no questions — <span className="text-white/80">you answer about your own player by hand</span>.
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

  /* --------------------------- connecting --------------------------- */
  if (phase === 'connecting' || !state) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-20 text-center animate-fade-in">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-pitch" />
        {code ? (
          <div>
            <p className="text-sm text-white/60">Share this code with your friend:</p>
            <p className="mt-1 font-display text-3xl font-bold tracking-[0.3em] text-pitch">{code}</p>
            <p className="mt-2 text-xs text-white/40">Waiting for them to join…</p>
          </div>
        ) : (
          <p className="text-sm text-white/50">Connecting…</p>
        )}
        <Button variant="ghost" size="sm" onClick={onExit}>Cancel</Button>
      </div>
    );
  }

  /* ----------------------------- playing ----------------------------- */
  const s = state;
  const oppId = s.players.find((p) => p.id !== localId)?.id ?? '';
  const me = s.players.find((p) => p.id === localId);
  const opp = s.players.find((p) => p.id === oppId);
  const mySecret = mysteryPlayerById(s.secret[localId] ?? '');
  const myTurn = s.turn === localId;
  const nameOf = (id: string) => (id === localId ? 'You' : s.players.find((p) => p.id === id)?.name ?? 'Player');

  const banner =
    conn === 'reconnecting' ? 'Reconnecting…' : conn === 'failed' ? 'Connection lost' : null;

  const inPlay = s.phase === 'active' || s.phase === 'awaiting_manual';

  let body: React.ReactNode;

  if (s.phase === 'selecting') {
    const iLocked = s.locked[localId];
    body = iLocked ? (
      <Waiting text="Waiting for your opponent to lock in their player…" />
    ) : (
      <div className="flex flex-col gap-3">
        <p className="text-center text-sm text-white/60">Pick your secret player — your opponent won’t see it.</p>
        <PlayerSearch actionLabel="Lock in" onPick={(p) => svc?.lock(p.id)} />
      </div>
    );
  } else if (s.phase === 'awaiting_manual') {
    const pending = s.pendingFree ?? (s.pendingVerified ? { askerId: s.pendingVerified.askerId } : null);
    const askerId = pending?.askerId;
    const iAnswer = askerId != null && opponentOf(s, askerId) === localId;
    const text = s.pendingFree ? `“${s.pendingFree.text}”` : s.pendingVerified ? questionLabel(s.pendingVerified.question) : '';
    if (iAnswer) {
      body = (
        <Card strong className="p-4 text-center animate-rise-in">
          <div className="text-xs uppercase tracking-wide text-white/40">{opp?.name} asks you about {mySecret?.name ?? 'your player'}</div>
          <p className="mt-1 font-display text-lg font-bold">{text}</p>
          <p className="mt-1 text-[11px] text-white/40">Answer honestly about your own secret player.</p>
          <div className="mt-3 flex justify-center gap-2">
            <Button onClick={() => svc?.answer('yes')}>Yes</Button>
            <Button variant="secondary" onClick={() => svc?.answer('no')}>No</Button>
            <Button variant="ghost" onClick={() => svc?.answer('unsure')}>Unsure</Button>
          </div>
        </Card>
      );
    } else {
      // I'm the asker — show what I asked while I wait, so the flow is clear.
      body = (
        <Card className="p-4 text-center animate-rise-in">
          <div className="text-xs uppercase tracking-wide text-white/40">You asked</div>
          <p className="mt-1 font-display text-lg font-bold">{text}</p>
          <div className="mt-3 flex items-center justify-center gap-2 text-sm text-white/55">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/15 border-t-pitch" />
            {opp?.name} is answering…
          </div>
        </Card>
      );
    }
  } else if (s.phase === 'round_over' || s.phase === 'match_over') {
    const iWon = s.roundWinner === localId;
    const matchOver = s.phase === 'match_over';
    const oppSecret = mysteryPlayerById(s.secret[oppId] ?? '');
    body = (
      <div className="flex flex-col items-center gap-4 py-6 text-center">
        <div className="text-5xl">{iWon ? '🏆' : '🫥'}</div>
        <h2 className="font-display text-2xl font-bold text-gradient-pitch">
          {iWon ? 'You won' : `${opp?.name} won`} {matchOver ? 'the match' : 'the round'}
        </h2>
        <p className="text-sm text-white/55">
          Score: {me?.name} {s.matchScore[localId]} – {s.matchScore[oppId]} {opp?.name}
        </p>
        <div className="flex flex-wrap justify-center gap-2 text-sm">
          <Badge tone="muted">{opp?.name}’s player was {oppSecret?.name ?? 'unknown'}</Badge>
          {mySecret && <Badge tone="muted">Yours was {mySecret.name}</Badge>}
        </div>
        {!matchOver && svc?.isHostPlayer() && (
          <Button onClick={() => svc?.startNextRound()}><IconBolt className="h-4 w-4" /> Next round</Button>
        )}
        {!matchOver && !svc?.isHostPlayer() && <Waiting text="Waiting for the host to start the next round…" />}
        <Button variant="secondary" onClick={onExit}>Leave</Button>
      </div>
    );
  } else {
    // active
    const candidates = currentCandidates(s, localId);
    body = (
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2">
          <Card className="p-3">
            <div className="text-[10px] uppercase tracking-wide text-white/40">Your secret</div>
            <div className="font-display text-base font-bold text-pitch">{mySecret?.name ?? '—'}</div>
          </Card>
          <Card className="p-3 text-right">
            <div className="text-[10px] uppercase tracking-wide text-white/40">Candidates left</div>
            <div className="font-display text-base font-bold">{candidates.length}</div>
          </Card>
        </div>
        {myTurn ? (
          guessing ? (
            <div className="flex flex-col gap-2">
              <p className="text-center text-sm text-white/60">Name your opponent’s secret player:</p>
              <PlayerSearch actionLabel="Guess" onPick={(p) => { svc?.guess(p.id); setGuessing(false); }} />
              <Button variant="ghost" size="sm" onClick={() => setGuessing(false)}>Cancel</Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={() => setBuilder(true)}>Ask a question</Button>
              <Button variant="secondary" onClick={() => setGuessing(true)}>Make a guess</Button>
            </div>
          )
        ) : (
          <Waiting text={`${opp?.name}’s turn…`} />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 py-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <button onClick={onExit} className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white">
          <IconBack className="h-4 w-4" /> Leave
        </button>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-xs text-white/45"><IconShare className="h-3.5 w-3.5" /> {code}</span>
          <Badge tone="gold">🕵️ Online</Badge>
        </div>
      </div>

      {/* Scoreboard / turn header */}
      {inPlay && (
        <Card className="flex items-center justify-between p-3">
          <Side name={me?.name ?? 'You'} you score={s.matchScore[localId]} active={myTurn} format={s.settings.format} />
          <div className="px-2 text-center">
            <div className="text-[10px] uppercase tracking-wide text-white/30">
              {s.settings.format === 'single' ? 'Mystery Duel' : s.settings.format.toUpperCase()}
            </div>
            <div className="font-display text-sm font-bold text-white/70">vs</div>
          </div>
          <Side name={opp?.name ?? 'Opponent'} score={s.matchScore[oppId]} active={!myTurn} format={s.settings.format} alignRight />
        </Card>
      )}

      {banner && (
        <div className="rounded-lg border border-gold/30 bg-gold/10 px-3 py-1.5 text-center text-xs font-semibold text-gold">
          {banner}
        </div>
      )}
      {body}

      {/* Latest answer reveal — so the asker actually sees the result. */}
      {inPlay && <LatestAnswer state={s} localId={localId} nameOf={nameOf} />}

      {/* Full question + answer history (the deduction log). */}
      {inPlay && (
        <Card className="p-4">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-white/70">Question log</h2>
          {s.history.length === 0 ? (
            <p className="text-xs text-white/40">No questions yet — ask away and watch the answers land here.</p>
          ) : (
            <ol className="flex max-h-64 flex-col gap-1.5 overflow-y-auto">
              {[...s.history].reverse().map((h) => {
                const mine = h.askerId === localId;
                return (
                  <li
                    key={h.id}
                    className={`rounded-lg border px-2.5 py-1.5 text-sm ${
                      mine ? 'border-pitch/25 bg-pitch/[0.06]' : 'border-white/10 bg-white/[0.03]'
                    }`}
                  >
                    <span className={mine ? 'font-semibold text-pitch' : 'text-white/45'}>
                      {nameOf(h.askerId)}:
                    </span>{' '}
                    <span className="text-white/80">{h.label}</span>{' '}
                    <AnswerTag entry={h} />
                  </li>
                );
              })}
            </ol>
          )}
        </Card>
      )}

      {builder && myTurn && s.phase === 'active' && (
        <QuestionBuilder
          onAsk={(q: VerifiedQuestion) => { svc?.ask(q); setBuilder(false); }}
          onClose={() => setBuilder(false)}
        />
      )}
    </div>
  );
}

/** One side of the scoreboard header. */
function Side({
  name,
  score,
  active,
  format,
  you = false,
  alignRight = false,
}: {
  name: string;
  score: number;
  active: boolean;
  format: RoomSettings['format'];
  you?: boolean;
  alignRight?: boolean;
}) {
  return (
    <div className={`min-w-0 flex-1 ${alignRight ? 'text-right' : ''}`}>
      <div className="flex items-center gap-1.5" style={alignRight ? { justifyContent: 'flex-end' } : undefined}>
        {active && !alignRight && <span className="h-2 w-2 shrink-0 rounded-full bg-pitch animate-pulse" />}
        <span className="truncate font-display text-sm font-bold">{name}{you ? ' (you)' : ''}</span>
        {active && alignRight && <span className="h-2 w-2 shrink-0 rounded-full bg-pitch animate-pulse" />}
      </div>
      <div className={`text-[11px] ${active ? 'text-pitch' : 'text-white/40'}`}>
        {format === 'single' ? (active ? 'Their turn' : ' ') : `${score} won`}
      </div>
    </div>
  );
}

/**
 * Highlights the single most recent answered question so the asker immediately
 * sees the result of what they just asked (the part that was invisible before).
 */
function LatestAnswer({
  state,
  localId,
  nameOf,
}: {
  state: MysteryState;
  localId: string;
  nameOf: (id: string) => string;
}) {
  const last = state.history[state.history.length - 1];
  if (!last) return null;
  const mine = last.askerId === localId;
  return (
    <Card strong className="p-3 animate-rise-in">
      <div className="text-[10px] uppercase tracking-wide text-white/40">
        {mine ? 'You learned' : `${nameOf(last.askerId)} asked`}
      </div>
      <div className="mt-0.5 flex items-baseline justify-between gap-2">
        <span className="min-w-0 truncate text-sm text-white/80">{last.label}</span>
        <span className="shrink-0 text-base">
          <AnswerTag entry={last} large />
        </span>
      </div>
    </Card>
  );
}

function AnswerTag({ entry, large = false }: { entry: MysteryState['history'][number]; large?: boolean }) {
  const size = large ? 'text-base' : '';
  if (entry.type === 'guess') {
    return (
      <span className={`${size} ${entry.answer ? 'font-semibold text-pitch' : 'font-semibold text-danger'}`}>
        {entry.answer ? '✓ correct' : '✗ wrong'}
      </span>
    );
  }
  if (entry.type === 'free') {
    return <span className={`${size} font-semibold text-gold`}>manual: {String(entry.answer)}</span>;
  }
  return (
    <span className={`${size} ${entry.answer ? 'font-semibold text-pitch' : 'font-semibold text-danger'}`}>
      {entry.answer ? '✓ Yes' : '✗ No'}
    </span>
  );
}

function Waiting({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-center text-white/55">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/15 border-t-pitch" />
      <p className="text-sm">{text}</p>
    </div>
  );
}
