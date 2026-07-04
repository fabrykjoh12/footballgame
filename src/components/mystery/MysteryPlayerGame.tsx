import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { mulberry32 } from '../../lib/seededRandom';
import { mysteryPlayerById } from '../../data/mysteryPlayers';
import {
  createMysteryGame,
  lockPlayer,
  askVerified,
  askFree,
  answerFree,
  answerVerifiedManual,
  makeGuess,
  skipTurn,
  nextRound,
  currentCandidates,
  opponentOf,
} from '../../lib/mysteryPlayer/mysteryPlayerEngine';
import { cpuChoosePlayer, cpuTakeTurn, cpuAnswerFree, cpuAnswerVerified } from '../../lib/mysteryPlayer/mysteryPlayerCpu';
import { questionLabel } from '../../lib/mysteryPlayer/mysteryPlayerQuestions';
import { getMysteryStore, saveMysterySettings, recordDuelResult } from '../../lib/mysteryPlayer/mysteryPlayerStorage';
import { buildMysteryShareText } from '../../lib/mysteryPlayer/mysteryPlayerShare';
import { roundsToWin } from '../../lib/mysteryPlayer/mysteryPlayerScoring';
import type {
  DuelPlayer,
  FreeAnswer,
  MysteryState,
  RoomSettings,
  VerifiedQuestion,
} from '../../lib/mysteryPlayer/mysteryPlayerTypes';
import { PlayerSearch } from './PlayerSearch';
import { QuestionBuilder } from './QuestionBuilder';
import { MysteryOnlineGame } from './MysteryOnlineGame';
import { isAblyConfigured } from '../../lib/realtimeConfig';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { IconBack, IconBolt, IconCheck, IconShare, IconClose } from '../ui/icons';
import { Search, MessagesSquare, Gavel, Fingerprint, ScrollText, Users } from 'lucide-react';
import { investigationFeedback, clueCommentary, type ClueStrength } from '../../lib/mysteryPlayer/mysteryFeedback';
import { createPortal } from 'react-dom';

const STRENGTH_STYLE: Record<ClueStrength, string> = {
  Weak: 'text-bone-faint bg-white/[0.05] border-white/10',
  Useful: 'text-brand-blue bg-brand-blue/12 border-brand-blue/25',
  Huge: 'text-gold bg-gold/12 border-gold/25',
  Killer: 'text-royal bg-royal/12 border-royal/30',
};

const CPU_ID = 'cpu';

export function MysteryPlayerGame({ onExit }: { onExit: () => void }) {
  const [name] = useLocalStorage('bk_name', '');
  const [opponent, setOpponent] = useState<'cpu' | 'hotseat'>('cpu');
  const [settings, setSettings] = useState<RoomSettings>(() => getMysteryStore().settings);
  const [state, setState] = useState<MysteryState | null>(null);
  const [online, setOnline] = useState(false);
  const rng = useRef(mulberry32(Math.floor(Date.now() % 0xffffffff)));

  const start = () => {
    saveMysterySettings(settings);
    const me: DuelPlayer = { id: 'a', name: name.trim() || 'You', isCpu: false };
    const foe: DuelPlayer =
      opponent === 'cpu'
        ? { id: CPU_ID, name: 'CPU Scout', isCpu: true }
        : { id: 'b', name: 'Player 2', isCpu: false };
    let g = createMysteryGame({ settings, players: [me, foe] });
    if (foe.isCpu) g = lockPlayer(g, CPU_ID, cpuChoosePlayer(rng.current), `cpu-${g.roundNumber}`);
    setState(g);
  };

  if (online) {
    return <MysteryOnlineGame settings={settings} name={name} onExit={() => setOnline(false)} />;
  }

  if (!state) {
    return (
      <MysteryLobby
        opponent={opponent}
        setOpponent={setOpponent}
        settings={settings}
        setSettings={setSettings}
        onStart={start}
        onOnline={() => setOnline(true)}
        onExit={onExit}
      />
    );
  }

  return (
    <MysteryRunner
      state={state}
      setState={setState}
      opponent={opponent}
      rng={rng.current}
      onRestart={start}
      onExit={onExit}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Lobby / settings                                                    */
/* ------------------------------------------------------------------ */

function MysteryLobby({
  opponent,
  setOpponent,
  settings,
  setSettings,
  onStart,
  onOnline,
  onExit,
}: {
  opponent: 'cpu' | 'hotseat';
  setOpponent: (o: 'cpu' | 'hotseat') => void;
  settings: RoomSettings;
  setSettings: (s: RoomSettings) => void;
  onStart: () => void;
  onOnline: () => void;
  onExit: () => void;
}) {
  const set = (patch: Partial<RoomSettings>) => setSettings({ ...settings, ...patch });

  return (
    <div className="flex flex-col gap-4 py-4 animate-fade-in">
      <button onClick={onExit} className="inline-flex items-center gap-1.5 self-start text-sm text-white/55 hover:text-white">
        <IconBack className="h-4 w-4" /> Home
      </button>

      <div className="text-center">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-gold/25 bg-gold/10 px-3 py-1 text-xs font-semibold text-gold">
          <Fingerprint className="h-3.5 w-3.5" /> Football detective
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-bone">Mystery Duel</h1>
        <p className="mx-auto mt-3 max-w-md text-balance text-bone-dim">
          Both managers hide a secret player. Trade scout reports to rule suspects
          out, read the evidence, and name the right one — before they name yours.
        </p>
      </div>

      <Card className="p-4">
        <h2 className="mb-2 text-xs font-semibold text-white/55">Opponent</h2>
        <div className="grid grid-cols-2 gap-2">
          <Seg active={opponent === 'cpu'} onClick={() => setOpponent('cpu')}>vs CPU Scout</Seg>
          <Seg active={opponent === 'hotseat'} onClick={() => setOpponent('hotseat')}>Pass & Play</Seg>
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="mb-3 text-xs font-semibold text-white/55">House rules</h2>
        <div className="flex flex-col gap-3 text-sm">
          <Row label="Timer">
            <Seg small active={!settings.timerOn} onClick={() => set({ timerOn: false })}>Off</Seg>
            <Seg small active={settings.timerOn} onClick={() => set({ timerOn: true })}>On</Seg>
          </Row>
          {settings.timerOn && (
            <Row label="Turn timer">
              {([15, 30, 45, 60] as const).map((t) => (
                <Seg key={t} small active={settings.turnTimer === t} onClick={() => set({ turnTimer: t })}>
                  {t}s
                </Seg>
              ))}
            </Row>
          )}
          <Row label="Questions">
            <Seg small active={settings.questionMode === 'verified'} onClick={() => set({ questionMode: 'verified' })}>Verified</Seg>
            <Seg small active={settings.questionMode === 'free'} onClick={() => set({ questionMode: 'free' })}>Free</Seg>
            <Seg small active={settings.questionMode === 'mixed'} onClick={() => set({ questionMode: 'mixed' })}>Mixed</Seg>
          </Row>
          {settings.questionMode !== 'free' && (
            <Row label="Verified answers">
              <Seg small active={settings.answerMode === 'auto'} onClick={() => set({ answerMode: 'auto' })}>Auto</Seg>
              <Seg small active={settings.answerMode === 'manual'} onClick={() => set({ answerMode: 'manual' })}>Manual</Seg>
            </Row>
          )}
          <Row label="Candidate helper">
            <Seg small active={settings.candidateHelper} onClick={() => set({ candidateHelper: true })}>On</Seg>
            <Seg small active={!settings.candidateHelper} onClick={() => set({ candidateHelper: false })}>Off</Seg>
          </Row>
          <Row label="Wrong guess">
            <Seg small active={settings.penalty === 'lose_turn'} onClick={() => set({ penalty: 'lose_turn' })}>Lose turn</Seg>
            <Seg small active={settings.penalty === 'free_question'} onClick={() => set({ penalty: 'free_question' })}>Free Q</Seg>
            <Seg small active={settings.penalty === 'instant_loss'} onClick={() => set({ penalty: 'instant_loss' })}>Instant loss</Seg>
            <Seg small active={settings.penalty === 'none'} onClick={() => set({ penalty: 'none' })}>None</Seg>
          </Row>
          <Row label="Format">
            <Seg small active={settings.format === 'single'} onClick={() => set({ format: 'single' })}>Single</Seg>
            <Seg small active={settings.format === 'bo3'} onClick={() => set({ format: 'bo3' })}>Best of 3</Seg>
            <Seg small active={settings.format === 'bo5'} onClick={() => set({ format: 'bo5' })}>Best of 5</Seg>
          </Row>
        </div>
      </Card>

      <Button size="lg" fullWidth onClick={onStart}>
        <IconBolt className="h-4 w-4" /> Start duel
      </Button>
      {isAblyConfigured && (
        <Button variant="secondary" fullWidth onClick={onOnline}>
          🌐 Play a friend online
        </Button>
      )}
      {(settings.questionMode !== 'verified' || settings.answerMode === 'manual') && (
        <p className="text-center text-[11px] text-white/55">
          {settings.answerMode === 'manual'
            ? 'Manual answers: your opponent taps Yes/No themselves — authentic Guess Who, best with a friend.'
            : 'Free questions are answered by hand by your opponent. Use with friends.'}
        </p>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="text-white/55">{label}</span>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Seg({
  active,
  small,
  onClick,
  children,
}: {
  active: boolean;
  small?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        'rounded-lg border font-semibold transition',
        small ? 'px-2.5 py-1 text-xs' : 'px-3 py-2 text-sm',
        active ? 'border-pitch/50 bg-pitch/15 text-pitch' : 'border-white/10 bg-white/[0.03] text-white/65',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Runner: selection → active → win                                    */
/* ------------------------------------------------------------------ */

function MysteryRunner({
  state,
  setState,
  opponent,
  rng,
  onRestart,
  onExit,
}: {
  state: MysteryState;
  setState: (s: MysteryState) => void;
  opponent: 'cpu' | 'hotseat';
  rng: () => number;
  onRestart: () => void;
  onExit: () => void;
}) {
  const hotseat = opponent === 'hotseat';
  const [revealedFor, setRevealedFor] = useState<string | null>(null);
  const [builder, setBuilder] = useState(false);
  const [freeOpen, setFreeOpen] = useState(false);
  const [guessing, setGuessing] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [showCands, setShowCands] = useState(false);

  const playerById = (id: string) => state.players.find((p) => p.id === id)!;

  // Who is the active person (whose private screen should show)?
  const activePersonId = useMemo(() => {
    if (state.phase === 'selecting') return state.players.find((p) => !state.locked[p.id] && !p.isCpu)?.id ?? null;
    if (state.phase === 'active') return state.turn;
    if (state.phase === 'awaiting_manual') {
      const askerId = state.pendingFree?.askerId ?? state.pendingVerified?.askerId;
      return askerId != null ? opponentOf(state, askerId) : null;
    }
    return null;
  }, [state]);

  const activeIsCpu = activePersonId ? playerById(activePersonId).isCpu : false;
  const showGate = hotseat && activePersonId != null && !activeIsCpu && revealedFor !== activePersonId;

  // CPU: auto-lock handled at start; auto-take turns + auto-answer free questions.
  useEffect(() => {
    if (state.phase === 'active' && playerById(state.turn).isCpu) {
      const id = setTimeout(() => {
        const action = cpuTakeTurn(state, state.turn, rng);
        setState(action.type === 'guess' ? makeGuess(state, state.turn, action.guessId) : askVerified(state, state.turn, action.question));
      }, 850);
      return () => clearTimeout(id);
    }
    if (state.phase === 'awaiting_manual' && state.pendingFree) {
      const answerer = opponentOf(state, state.pendingFree.askerId);
      if (playerById(answerer).isCpu) {
        const id = setTimeout(() => setState(answerFree(state, cpuAnswerFree())), 700);
        return () => clearTimeout(id);
      }
    }
    if (state.phase === 'awaiting_manual' && state.pendingVerified) {
      const answerer = opponentOf(state, state.pendingVerified.askerId);
      if (playerById(answerer).isCpu) {
        const secretId = state.secret[answerer] ?? '';
        const ans = cpuAnswerVerified(secretId, state.pendingVerified.question);
        const id = setTimeout(() => setState(answerVerifiedManual(state, ans)), 700);
        return () => clearTimeout(id);
      }
    }
  }, [state]);

  // Turn timer (human turns only, once revealed).
  useEffect(() => {
    if (!state.settings.timerOn || state.phase !== 'active' || activeIsCpu || showGate) return;
    setSecondsLeft(state.settings.turnTimer);
    const id = setInterval(() => {
      setSecondsLeft((n) => {
        if (n <= 1) {
          clearInterval(id);
          setState(skipTurn(state, state.turn));
          return 0;
        }
        return n - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [state.turn, state.phase, state.settings.timerOn, showGate, activeIsCpu]);

  // Win / match-over screen.
  if (state.phase === 'match_over' && state.winner) {
    return <MysteryWin state={state} onRestart={onRestart} onExit={onExit} />;
  }

  // Round over (best-of series).
  if (state.phase === 'round_over' && state.roundWinner) {
    const w = playerById(state.roundWinner);
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-5 py-12 text-center animate-fade-in">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gold/12 text-gold">
          <Gavel className="h-7 w-7" />
        </div>
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Case {state.roundNumber} closed</div>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-bone">{w.name} cracked it</h1>
        </div>
        <p className="text-sm text-bone-dim">
          Series {scoreLine(state)} · first to {roundsToWin(state.settings.format)}
        </p>
        <Button size="lg" onClick={() => { setRevealedFor(null); setState(nextRound(state)); }}>
          Next case <IconBolt className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  // Pass-the-device gate (hot-seat privacy).
  if (showGate && activePersonId) {
    const p = playerById(activePersonId);
    const verb = state.phase === 'selecting' ? 'pick your secret player' : state.phase === 'awaiting_manual' ? 'answer a question' : 'take your turn';
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 py-16 text-center animate-fade-in">
        <div className="text-5xl" aria-hidden>🤝</div>
        <div>
          <div className="text-xs text-white/55">Pass the device</div>
          <h1 className="mt-1 font-display text-2xl font-bold">{p.name}, ready to {verb}?</h1>
        </div>
        <Button size="lg" onClick={() => setRevealedFor(activePersonId)}>Reveal my screen</Button>
      </div>
    );
  }

  // Selection.
  if (state.phase === 'selecting' && activePersonId) {
    const picker = playerById(activePersonId);
    return (
      <div className="flex flex-col gap-4 py-4 animate-fade-in">
        <button onClick={onExit} className="inline-flex items-center gap-1.5 self-start text-sm text-white/55 hover:text-white">
          <IconBack className="h-4 w-4" /> Quit duel
        </button>
        <div className="text-center">
          <div className="text-xs text-white/55">{picker.name}</div>
          <h1 className="font-display text-2xl font-bold">Choose your mystery player</h1>
          <p className="mt-1 text-xs text-white/55">Pick anyone — obscure picks are allowed (and sneaky).</p>
        </div>
        <Card className="p-4">
          <PlayerSearch
            actionLabel="Lock"
            onPick={(p) => {
              setState(lockPlayer(state, picker.id, p.id, `${picker.id}-${state.roundNumber}`));
              setRevealedFor(null);
            }}
          />
        </Card>
      </div>
    );
  }

  // Active turn / awaiting a manual answer — the "case file" board.
  if (state.phase === 'active' || state.phase === 'awaiting_manual') {
    const s = state;
    const turnPlayer = playerById(s.turn);
    // The human investigator's perspective (never leaks the CPU's secret).
    const meId = turnPlayer.isCpu ? opponentOf(s, s.turn) : s.turn;
    const mySecret = mysteryPlayerById(s.secret[meId] ?? '');
    const candidates = currentCandidates(s, meId);
    const fb = investigationFeedback(s, meId);
    const mode = s.settings.questionMode;
    const manualPrompt =
      s.phase === 'awaiting_manual'
        ? s.pendingFree
          ? { askerId: s.pendingFree.askerId, text: `“${s.pendingFree.text}”`, onAnswer: (a: FreeAnswer) => answerFree(s, a) }
          : s.pendingVerified
            ? { askerId: s.pendingVerified.askerId, text: questionLabel(s.pendingVerified.question), onAnswer: (a: FreeAnswer) => answerVerifiedManual(s, a) }
            : null
        : null;
    const lastEntry = s.history[s.history.length - 1];
    const myTurn = !turnPlayer.isCpu && s.phase === 'active';

    return (
      <div className="flex flex-col gap-4 py-4 animate-fade-in">
        {/* Case header */}
        <div className="flex items-center justify-between gap-2">
          <button onClick={onExit} className="inline-flex items-center gap-1.5 text-sm text-bone-dim hover:text-bone">
            <IconBack className="h-4 w-4" /> Quit case
          </button>
          <div className="flex items-center gap-2">
            <Badge tone="gold"><Fingerprint className="h-3.5 w-3.5" /> Case File</Badge>
            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${myTurn ? 'border-royal/30 bg-royal/12 text-royal' : 'border-white/10 bg-white/[0.04] text-bone-dim'}`}>
              {myTurn ? 'Your move' : `${turnPlayer.name} investigating…`}
              {s.settings.timerOn && myTurn ? ` · ${secondsLeft}s` : ''}
            </span>
          </div>
        </div>

        {manualPrompt ? (
          <Card strong className="p-5 text-center">
            <div className="text-xs uppercase tracking-wide text-gold">Interrogation</div>
            <div className="mt-1 text-sm text-bone-dim">{playerById(manualPrompt.askerId).name} demands an answer</div>
            <p className="mt-2 text-lg font-bold text-bone">{manualPrompt.text}</p>
            <div className="mt-4 flex justify-center gap-2">
              <Button onClick={() => { setState(manualPrompt.onAnswer('yes')); setRevealedFor(null); }}>Yes</Button>
              <Button variant="secondary" onClick={() => { setState(manualPrompt.onAnswer('no')); setRevealedFor(null); }}>No</Button>
              <Button variant="ghost" onClick={() => { setState(manualPrompt.onAnswer('unsure')); setRevealedFor(null); }}>Unsure</Button>
            </div>
          </Card>
        ) : (
          <>
            {/* Top: your case file + the investigation */}
            <div className="grid gap-3 sm:grid-cols-2">
              {/* Your secret suspect */}
              <div className="glass overflow-hidden">
                <div className="flex items-center gap-3 border-b border-white/[0.06] p-3">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-ink-600 to-ink-700 text-bone-faint ring-1 ring-white/10">
                    <Fingerprint className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-[11px] uppercase tracking-wide text-bone-faint">Your protected identity</div>
                    <div className="truncate text-lg font-bold text-royal">{mySecret?.name ?? '—'}</div>
                  </div>
                </div>
                <p className="px-3 py-2.5 text-[11px] text-bone-dim">
                  Keep them off your opponent’s board. Only you can see this file.
                </p>
              </div>

              {/* The investigation: shortlist + suspicion */}
              <div className="glass overflow-hidden">
                <button
                  className="flex w-full items-center gap-3 border-b border-white/[0.06] p-3 text-left"
                  onClick={() => setShowCands((v) => !v)}
                  disabled={!s.settings.candidateHelper}
                >
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-blue/12 text-brand-blue ring-1 ring-brand-blue/25">
                    <Users className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] uppercase tracking-wide text-bone-faint">Shortlist remaining</div>
                    <div className="nums text-lg font-bold text-bone">
                      {s.settings.candidateHelper ? candidates.length : '—'}
                      {s.settings.candidateHelper && <span className="text-xs font-normal text-bone-faint"> suspects</span>}
                    </div>
                  </div>
                </button>
                <div className="px-3 py-2.5">
                  <div className="mb-1 flex items-center justify-between text-[11px] text-bone-faint">
                    <span>Suspicion</span>
                    <span className="nums">{Math.round(fb.suspicion * 100)}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-ink-600">
                    <div className="h-full rounded-full bg-gradient-to-r from-gold-dark to-gold transition-[width] duration-500" style={{ width: `${Math.max(3, Math.round(fb.suspicion * 100))}%` }} />
                  </div>
                  {s.settings.candidateHelper && showCands && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {candidates.slice(0, 24).map((p) => (
                        <span key={p.id} className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] text-bone-dim">{p.name}</span>
                      ))}
                      {candidates.length > 24 && <span className="text-[11px] text-bone-faint">+{candidates.length - 24} more</span>}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Latest evidence + clue strength */}
            {lastEntry && (
              <Card strong className="p-3.5 animate-rise-in">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[11px] uppercase tracking-wide text-bone-faint">Latest evidence</div>
                  {lastEntry.type === 'verified' && fb.strength && (
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${STRENGTH_STYLE[fb.strength]}`}>
                      {fb.strength} clue
                    </span>
                  )}
                </div>
                <div className="mt-1 flex items-baseline justify-between gap-2">
                  <span className="min-w-0 truncate text-sm">
                    <span className="text-bone-faint">{playerById(lastEntry.askerId).name}: </span>
                    <span className="text-bone">{lastEntry.label}</span>
                  </span>
                  <span className="shrink-0 text-base font-bold"><AnswerTag entry={lastEntry} /></span>
                </div>
                {lastEntry.type === 'verified' && (
                  <div className="mt-1.5 text-xs text-bone-dim">{clueCommentary(fb)}</div>
                )}
              </Card>
            )}

            {/* Action panel */}
            {myTurn && (
              <Card className="p-3">
                <div className="mb-2 text-[11px] uppercase tracking-wide text-bone-faint">Detective actions</div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {(mode === 'verified' || mode === 'mixed') && (
                    <Button fullWidth onClick={() => setBuilder(true)}>
                      <Search className="h-4 w-4" /> Scout report
                    </Button>
                  )}
                  {(mode === 'free' || mode === 'mixed') && (
                    <Button variant="secondary" fullWidth onClick={() => setFreeOpen(true)}>
                      <MessagesSquare className="h-4 w-4" /> Ask custom
                    </Button>
                  )}
                  <Button variant="gold" fullWidth onClick={() => setGuessing(true)}>
                    <Gavel className="h-4 w-4" /> Accuse
                  </Button>
                </div>
              </Card>
            )}

            {/* Evidence log */}
            <Card className="p-4">
              <div className="mb-2 flex items-center gap-2">
                <ScrollText className="h-4 w-4 text-bone-faint" />
                <h2 className="text-sm font-bold text-bone">Evidence log</h2>
              </div>
              {s.history.length === 0 ? (
                <p className="text-xs text-bone-dim">The board is clean. Request your first scout report to start ruling suspects out.</p>
              ) : (
                <ol className="flex flex-col gap-1.5">
                  {[...s.history].reverse().map((h) => (
                    <li key={h.id} className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="min-w-0 truncate">
                        <span className="text-bone-faint">{playerById(h.askerId).name}: </span>
                        <span className="text-bone">{h.label}</span>
                      </span>
                      <span className="shrink-0"><AnswerTag entry={h} /></span>
                    </li>
                  ))}
                </ol>
              )}
            </Card>
          </>
        )}

        {builder && (
          <QuestionBuilder
            onAsk={(q: VerifiedQuestion) => { setState(askVerified(s, s.turn, q)); setBuilder(false); setRevealedFor(null); }}
            onClose={() => setBuilder(false)}
          />
        )}
        {freeOpen && (
          <FreeQuestionModal
            onAsk={(text) => { setState(askFree(s, s.turn, text)); setFreeOpen(false); }}
            onClose={() => setFreeOpen(false)}
          />
        )}
        {guessing && (
          <GuessModal
            penalty={s.settings.penalty}
            onGuess={(id) => { setState(makeGuess(s, s.turn, id)); setGuessing(false); setRevealedFor(null); }}
            onClose={() => setGuessing(false)}
          />
        )}
      </div>
    );
  }

  return null;
}

function AnswerTag({ entry }: { entry: MysteryState['history'][number] }) {
  if (entry.type === 'guess') {
    return (
      <span className={entry.answer ? 'font-semibold text-pitch' : 'font-semibold text-danger'}>
        {entry.answer ? '✓ correct' : '✗ wrong'}
      </span>
    );
  }
  if (entry.type === 'free') {
    return <span className="font-semibold text-gold">manual: {String(entry.answer)}</span>;
  }
  return (
    <span className={entry.answer ? 'font-semibold text-pitch' : 'font-semibold text-white/55'}>
      {entry.answer ? 'Yes' : 'No'}
    </span>
  );
}

function scoreLine(s: MysteryState): string {
  const [a, b] = s.players;
  return `${a.name} ${s.matchScore[a.id]}–${s.matchScore[b.id]} ${b.name}`;
}

/* ------------------------------------------------------------------ */
/* Modals                                                              */
/* ------------------------------------------------------------------ */

function FreeQuestionModal({ onAsk, onClose }: { onAsk: (t: string) => void; onClose: () => void }) {
  const [text, setText] = useState('');
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink-900/85 px-5 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-ink-800 p-5 shadow-elev-2" onClick={(e) => e.stopPropagation()}>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-bold text-bone">Ask a custom question</h2>
          <button onClick={onClose} aria-label="Close" className="text-bone-dim hover:text-bone"><IconClose className="h-5 w-5" /></button>
        </div>
        <p className="mb-2 text-[11px] text-bone-dim">Off the record — your opponent answers by hand (Yes / No / Unsure). It won’t auto-clear the shortlist.</p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder="Did your player ever line up alongside Messi?"
          className="input-field mb-3 w-full resize-none text-sm"
        />
        <Button fullWidth disabled={!text.trim()} onClick={() => onAsk(text)}>Put it to them</Button>
      </div>
    </div>,
    document.body,
  );
}

function GuessModal({
  penalty,
  onGuess,
  onClose,
}: {
  penalty: RoomSettings['penalty'];
  onGuess: (id: string) => void;
  onClose: () => void;
}) {
  const [chosen, setChosen] = useState<string | null>(null);
  const chosenP = chosen ? mysteryPlayerById(chosen) : null;
  const penaltyText: Record<RoomSettings['penalty'], string> = {
    lose_turn: 'You lose your turn.',
    free_question: 'Your opponent gets a free question.',
    instant_loss: 'You lose the round instantly.',
    none: 'No penalty.',
  };
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-ink-900/85 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-white/10 bg-ink-800 p-5 shadow-elev-2 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-bone">{chosenP ? 'Confirm the accusation' : 'Make your final accusation'}</h2>
          <button onClick={onClose} aria-label="Close" className="text-bone-dim hover:text-bone"><IconClose className="h-5 w-5" /></button>
        </div>
        {chosenP ? (
          <div className="text-center">
            <div className="text-xs uppercase tracking-wide text-gold">The accused</div>
            <div className="mt-1 text-2xl font-bold text-royal">{chosenP.name}</div>
            <p className="mt-3 text-xs text-bone-dim">If the accusation is wrong: {penaltyText[penalty]}</p>
            <div className="mt-4 flex gap-2">
              <Button variant="ghost" fullWidth onClick={() => setChosen(null)}>Back</Button>
              <Button fullWidth onClick={() => onGuess(chosenP.id)}>
                <Gavel className="h-4 w-4" /> Accuse
              </Button>
            </div>
          </div>
        ) : (
          <PlayerSearch actionLabel="Accuse" onPick={(p) => setChosen(p.id)} />
        )}
      </div>
    </div>,
    document.body,
  );
}

/* ------------------------------------------------------------------ */
/* Win screen                                                          */
/* ------------------------------------------------------------------ */

function MysteryWin({
  state,
  onRestart,
  onExit,
}: {
  state: MysteryState;
  onRestart: () => void;
  onExit: () => void;
}) {
  const winner = state.players.find((p) => p.id === state.winner)!;
  const loser = state.players.find((p) => p.id !== state.winner)!;
  const solved = mysteryPlayerById(state.secret[loser.id] ?? '');
  const questionsUsed = state.questionsAsked[winner.id];
  const wrong = state.wrongGuesses[winner.id];
  const [shared, setShared] = useState(false);
  const recorded = useRef(false);

  useEffect(() => {
    if (recorded.current) return;
    recorded.current = true;
    // Record from the human player's perspective ('a').
    if (state.players.some((p) => p.id === 'a')) recordDuelResult(state.winner === 'a');
  }, []);

  const share = async () => {
    const text = buildMysteryShareText({
      winnerName: winner.name,
      loserName: loser.name,
      solvedPlayerName: solved?.name ?? 'their player',
      questionsUsed,
      wrongGuesses: wrong,
    });
    try {
      if (navigator.share) await navigator.share({ text });
      else await navigator.clipboard.writeText(text);
      setShared(true);
      setTimeout(() => setShared(false), 1800);
    } catch {
      /* dismissed */
    }
  };

  // "Case failed" when the CPU cracked it; "Case closed" when a detective wins.
  const failed = winner.isCpu;
  const rating = detectiveRating(questionsUsed, wrong);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 py-12 text-center animate-fade-in">
      <div className={`grid h-16 w-16 place-items-center rounded-2xl ${failed ? 'bg-danger/12 text-danger' : 'bg-gold/12 text-gold'}`}>
        {failed ? <IconClose className="h-8 w-8" /> : <Gavel className="h-8 w-8" />}
      </div>
      <div>
        <div className={`text-xs font-bold uppercase tracking-[0.2em] ${failed ? 'text-danger' : 'text-gold'}`}>
          {failed ? 'Case failed' : 'Case closed'}
        </div>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-bone">
          {failed ? `${winner.name} cracked it first` : `${winner.name} cracked the case`}
        </h1>
      </div>

      <Card className="w-full max-w-xs p-4">
        <div className="text-[11px] uppercase tracking-wide text-bone-faint">The accused was</div>
        <div className="mt-1 text-xl font-bold text-royal">{solved?.name ?? '—'}</div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Stat label="Reports" value={String(questionsUsed)} />
          <Stat label="Wrong calls" value={String(wrong)} />
          <Stat label="Grade" value={rating} />
        </div>
        {state.settings.format !== 'single' && (
          <div className="mt-2 text-xs text-bone-dim">Series: {scoreLine(state)}</div>
        )}
      </Card>

      <div className="flex w-full max-w-xs flex-col gap-2">
        <Button variant="secondary" fullWidth onClick={share}>
          {shared ? <IconCheck className="h-4 w-4 text-pitch" /> : <IconShare className="h-4 w-4" />}
          {shared ? 'Shared!' : 'Share the case'}
        </Button>
        <Button fullWidth onClick={onRestart}>New case</Button>
        <Button variant="ghost" fullWidth onClick={onExit}>
          <IconBack className="h-4 w-4" /> Home
        </Button>
      </div>
    </div>
  );
}

/** A quick "detective grade" from efficiency — fewer reports & wrong calls = better. */
function detectiveRating(reports: number, wrong: number): string {
  const score = reports + wrong * 4;
  if (score <= 5) return 'S';
  if (score <= 8) return 'A';
  if (score <= 12) return 'B';
  if (score <= 18) return 'C';
  return 'D';
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2 text-center">
      <div className="text-xl font-bold text-royal">{value}</div>
      <div className="mt-0.5 text-[11px] text-bone-faint">{label}</div>
    </div>
  );
}
