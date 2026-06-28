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
import { createPortal } from 'react-dom';

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
      <button onClick={onExit} className="inline-flex items-center gap-1.5 self-start text-sm text-white/50 hover:text-white">
        <IconBack className="h-4 w-4" /> Home
      </button>

      <div className="text-center">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
          🕵️ Deduction duel
        </div>
        <h1 className="font-display text-4xl font-bold tracking-tight">
          <span className="text-gradient-pitch">Mystery Player Duel</span>
        </h1>
        <p className="mx-auto mt-3 max-w-md text-balance text-white/60">
          Pick any player in secret. Take turns asking yes/no questions. First to
          guess the opponent’s player wins. Let’s see who really knows ball.
        </p>
      </div>

      <Card className="p-4">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/45">Opponent</h2>
        <div className="grid grid-cols-2 gap-2">
          <Seg active={opponent === 'cpu'} onClick={() => setOpponent('cpu')}>vs CPU Scout</Seg>
          <Seg active={opponent === 'hotseat'} onClick={() => setOpponent('hotseat')}>Pass & Play</Seg>
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-white/45">House rules</h2>
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
        <p className="text-center text-[11px] text-white/40">
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
        <div className="text-5xl" aria-hidden>🎯</div>
        <h1 className="font-display text-3xl font-bold text-gradient-pitch">
          {w.name} win round {state.roundNumber}
        </h1>
        <p className="text-sm text-white/55">
          Match score — {scoreLine(state)} · first to {roundsToWin(state.settings.format)}
        </p>
        <Button size="lg" onClick={() => { setRevealedFor(null); setState(nextRound(state)); }}>
          Next round <IconBolt className="h-4 w-4" />
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
          <div className="text-xs uppercase tracking-[0.2em] text-white/40">Pass the device</div>
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
        <button onClick={onExit} className="inline-flex items-center gap-1.5 self-start text-sm text-white/50 hover:text-white">
          <IconBack className="h-4 w-4" /> Quit duel
        </button>
        <div className="text-center">
          <div className="text-xs uppercase tracking-[0.2em] text-white/40">{picker.name}</div>
          <h1 className="font-display text-2xl font-bold">Choose your mystery player</h1>
          <p className="mt-1 text-xs text-white/45">Pick anyone — obscure picks are allowed (and sneaky).</p>
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

  // Active turn / awaiting a manual answer.
  if (state.phase === 'active' || state.phase === 'awaiting_manual') {
    const s = state;
    const turnPlayer = playerById(s.turn);
    const mySecret = s.phase === 'active' ? mysteryPlayerById(s.secret[s.turn] ?? '') : null;
    const candidates = s.phase === 'active' ? currentCandidates(s, s.turn) : [];
    const mode = s.settings.questionMode;
    // A pending manual answer — either a free-text question or a structured
    // (verified) one in manual answer mode. Unified so the prompt renders once.
    const manualPrompt =
      s.phase === 'awaiting_manual'
        ? s.pendingFree
          ? { askerId: s.pendingFree.askerId, text: `“${s.pendingFree.text}”`, onAnswer: (a: FreeAnswer) => answerFree(s, a) }
          : s.pendingVerified
            ? { askerId: s.pendingVerified.askerId, text: questionLabel(s.pendingVerified.question), onAnswer: (a: FreeAnswer) => answerVerifiedManual(s, a) }
            : null
        : null;

    return (
      <div className="flex flex-col gap-4 py-4 animate-fade-in">
        <div className="flex items-center justify-between gap-2">
          <button onClick={onExit} className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white">
            <IconBack className="h-4 w-4" /> Quit
          </button>
          <Badge tone="gold">🕵️ Mystery Player Duel</Badge>
        </div>

        {/* Status */}
        <Card strong className="p-4">
          {manualPrompt ? (
            <div className="text-center">
              <div className="text-xs uppercase tracking-wide text-white/40">
                {playerById(manualPrompt.askerId).name} asks you
              </div>
              <p className="mt-1 font-display text-lg font-bold">{manualPrompt.text}</p>
              <div className="mt-3 flex justify-center gap-2">
                <Button onClick={() => { setState(manualPrompt.onAnswer('yes')); setRevealedFor(null); }}>Yes</Button>
                <Button variant="secondary" onClick={() => { setState(manualPrompt.onAnswer('no')); setRevealedFor(null); }}>No</Button>
                <Button variant="ghost" onClick={() => { setState(manualPrompt.onAnswer('unsure')); setRevealedFor(null); }}>Unsure</Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-white/40">Your secret</div>
                  <div className="font-display text-lg font-bold text-pitch">{mySecret?.name ?? '—'}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-wide text-white/40">Turn</div>
                  <div className="font-semibold">
                    {turnPlayer.isCpu ? `${turnPlayer.name} thinking…` : turnPlayer.name}
                  </div>
                  <div className="text-[11px] text-white/45">
                    {s.settings.timerOn ? `${secondsLeft}s left` : 'no timer'}
                  </div>
                </div>
              </div>

              {!turnPlayer.isCpu && (
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {(mode === 'verified' || mode === 'mixed') && (
                    <Button fullWidth onClick={() => setBuilder(true)}>Ask Verified</Button>
                  )}
                  {(mode === 'free' || mode === 'mixed') && (
                    <Button variant="secondary" fullWidth onClick={() => setFreeOpen(true)}>Ask Free</Button>
                  )}
                  <Button variant="ghost" fullWidth onClick={() => setGuessing(true)}>Final Guess</Button>
                </div>
              )}
            </>
          )}
        </Card>

        {/* Candidate helper */}
        {s.settings.candidateHelper && s.phase === 'active' && !turnPlayer.isCpu && (
          <Card className="p-3">
            <button className="flex w-full items-center justify-between" onClick={() => setShowCands((v) => !v)}>
              <span className="text-sm font-semibold">Possible players left</span>
              <span className="font-mono font-bold text-pitch">{candidates.length}</span>
            </button>
            {showCands && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {candidates.slice(0, 40).map((p) => (
                  <span key={p.id} className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[11px] text-white/60">
                    {p.name}
                  </span>
                ))}
                {candidates.length > 40 && <span className="text-[11px] text-white/40">+{candidates.length - 40} more</span>}
              </div>
            )}
          </Card>
        )}

        {/* History */}
        <Card className="p-4">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-white/70">Question history</h2>
          {s.history.length === 0 ? (
            <p className="text-xs text-white/40">No questions yet — fire away.</p>
          ) : (
            <ol className="flex flex-col gap-1.5">
              {s.history.map((h) => (
                <li key={h.id} className="text-sm">
                  <span className="text-white/45">{playerById(h.askerId).name}: </span>
                  <span className="text-white/80">{h.label}</span>{' '}
                  <AnswerTag entry={h} />
                </li>
              ))}
            </ol>
          )}
        </Card>

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
    <span className={entry.answer ? 'font-semibold text-pitch' : 'font-semibold text-white/50'}>
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
          <h2 className="font-display text-lg font-bold">Ask a free question</h2>
          <button onClick={onClose} aria-label="Close" className="text-white/50 hover:text-white"><IconClose className="h-5 w-5" /></button>
        </div>
        <p className="mb-2 text-[11px] text-white/45">Your opponent answers this by hand (Yes / No / Unsure). It won’t auto-filter candidates.</p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder="Did your player ever play with Messi?"
          className="input-field mb-3 w-full resize-none text-sm"
        />
        <Button fullWidth disabled={!text.trim()} onClick={() => onAsk(text)}>Ask</Button>
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
          <h2 className="font-display text-lg font-bold">{chosenP ? 'Confirm your guess' : 'Make your final guess'}</h2>
          <button onClick={onClose} aria-label="Close" className="text-white/50 hover:text-white"><IconClose className="h-5 w-5" /></button>
        </div>
        {chosenP ? (
          <div className="text-center">
            <div className="text-xs uppercase tracking-wide text-white/40">Final guess</div>
            <div className="mt-1 font-display text-2xl font-bold text-pitch">{chosenP.name}</div>
            <p className="mt-3 text-xs text-white/55">If you’re wrong: {penaltyText[penalty]}</p>
            <div className="mt-4 flex gap-2">
              <Button variant="ghost" fullWidth onClick={() => setChosen(null)}>Back</Button>
              <Button fullWidth onClick={() => onGuess(chosenP.id)}>
                <IconCheck className="h-4 w-4" /> Confirm
              </Button>
            </div>
          </div>
        ) : (
          <PlayerSearch actionLabel="Guess" onPick={(p) => setChosen(p.id)} />
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

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 py-12 text-center animate-fade-in">
      <div className="text-xs font-bold uppercase tracking-[0.3em] text-gold">Mystery solved</div>
      <h1 className="font-display text-3xl font-bold text-gradient-pitch">{winner.name} win!</h1>
      <Card className="w-full max-w-xs p-4">
        <div className="text-[10px] uppercase tracking-wide text-white/40">The mystery player was</div>
        <div className="mt-1 font-display text-xl font-bold text-pitch">{solved?.name ?? '—'}</div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Stat label="Questions" value={String(questionsUsed)} />
          <Stat label="Wrong guesses" value={String(wrong)} />
        </div>
        {state.settings.format !== 'single' && (
          <div className="mt-2 text-xs text-white/55">Match: {scoreLine(state)}</div>
        )}
      </Card>

      <div className="flex w-full max-w-xs flex-col gap-2">
        <Button variant="secondary" fullWidth onClick={share}>
          {shared ? <IconCheck className="h-4 w-4 text-pitch" /> : <IconShare className="h-4 w-4" />}
          {shared ? 'Shared!' : 'Share result'}
        </Button>
        <Button fullWidth onClick={onRestart}>Rematch</Button>
        <Button variant="ghost" fullWidth onClick={onExit}>
          <IconBack className="h-4 w-4" /> Home
        </Button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2 text-center">
      <div className="font-display text-xl font-bold text-pitch">{value}</div>
      <div className="mt-0.5 text-[10px] uppercase tracking-wide text-white/40">{label}</div>
    </div>
  );
}
