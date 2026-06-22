import { useEffect, useState } from 'react';
import { useGame } from '../../context/GameProvider';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { isValidRoomCode, normalizeRoomCode } from '../../lib/roomCode';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import {
  IconUsers,
  IconRoute,
  IconScale,
  IconTrophy,
  IconBolt,
} from '../ui/icons';

const FEATURES = [
  {
    icon: IconUsers,
    title: 'Real-time 1v1 duels',
    desc: 'Share a room code and battle a friend live.',
  },
  {
    icon: IconRoute,
    title: 'Career path challenges',
    desc: 'Name the player from their club timeline.',
  },
  {
    icon: IconScale,
    title: 'Higher or lower',
    desc: 'Goals, caps, trophies — back your judgement.',
  },
  {
    icon: IconTrophy,
    title: 'Football-style scoring',
    desc: 'Points become goals. Win the match, not the quiz.',
  },
];

export function HomePage() {
  const {
    createRoom,
    joinRoom,
    playDemo,
    connecting,
    error,
    multiplayerAvailable,
    multiplayerProvider,
  } = useGame();
  const [name, setName] = useLocalStorage('bk_name', '');
  const [showJoin, setShowJoin] = useState(false);
  const [code, setCode] = useState('');

  // Prefill the join code from a shared link (?room=BK7Q2).
  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get('room');
    if (param) {
      setCode(normalizeRoomCode(param).slice(0, 8));
      setShowJoin(true);
    }
  }, []);

  const nameValid = name.trim().length >= 1;
  const codeValid = isValidRoomCode(code);

  return (
    <div className="flex flex-1 flex-col justify-center gap-8 py-6 animate-fade-in">
      {/* Hero */}
      <div className="text-center">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
          <IconBolt className="h-3.5 w-3.5 text-pitch" />
          Kahoot × Football Wordle × FIFA trivia
        </div>
        <h1 className="font-display text-5xl font-bold leading-none tracking-tight sm:text-6xl">
          <span className="text-gradient-pitch">Ball Knowledge</span>
        </h1>
        <p className="mx-auto mt-4 max-w-md text-balance text-white/60">
          Prove your football IQ against your friends.
        </p>
      </div>

      {/* Entry card */}
      <Card strong className="mx-auto w-full max-w-md p-5 sm:p-6">
        <label htmlFor="player-name" className="mb-1.5 block text-sm font-medium text-white/70">
          Your name
        </label>
        <input
          id="player-name"
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 18))}
          placeholder="e.g. Sara"
          autoComplete="off"
          className="mb-4 w-full rounded-xl border border-white/10 bg-ink-800/60 px-4 py-3 text-white placeholder:text-white/30 focus:border-pitch/50"
        />

        <div className="flex flex-col gap-2.5">
          <Button
            size="lg"
            fullWidth
            disabled={!nameValid || connecting}
            onClick={() => createRoom(name)}
          >
            Create Room
          </Button>

          {!showJoin ? (
            <Button
              variant="secondary"
              size="lg"
              fullWidth
              disabled={connecting}
              onClick={() => setShowJoin(true)}
            >
              Join Room
            </Button>
          ) : (
            <div className="flex flex-col gap-2 rounded-xl border border-white/10 bg-ink-800/40 p-3 animate-scale-in">
              <input
                value={code}
                onChange={(e) => setCode(normalizeRoomCode(e.target.value).slice(0, 8))}
                placeholder="Room code (e.g. BK7Q2)"
                autoComplete="off"
                inputMode="text"
                aria-label="Room code"
                className="w-full rounded-lg border border-white/10 bg-ink-900/60 px-4 py-3 text-center font-mono text-lg tracking-[0.25em] uppercase placeholder:tracking-normal placeholder:text-white/30 focus:border-pitch/50"
              />
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  fullWidth
                  onClick={() => setShowJoin(false)}
                >
                  Cancel
                </Button>
                <Button
                  fullWidth
                  disabled={!nameValid || !codeValid || connecting}
                  onClick={() => joinRoom(code, name)}
                >
                  Join
                </Button>
              </div>
            </div>
          )}

          <div className="my-1 flex items-center gap-3 text-[11px] uppercase tracking-widest text-white/30">
            <span className="h-px flex-1 bg-white/10" />
            or
            <span className="h-px flex-1 bg-white/10" />
          </div>

          <Button
            variant="ghost"
            fullWidth
            disabled={!nameValid || connecting}
            onClick={() => playDemo(name)}
          >
            Play Local Demo (vs CPU)
          </Button>
        </div>

        {!nameValid && (
          <p className="mt-3 text-center text-xs text-white/40">
            Enter a name to start.
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="mt-3 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-center text-sm text-danger"
          >
            {error}
          </p>
        )}
        {connecting && (
          <p className="mt-3 text-center text-sm text-pitch animate-pulse">
            Connecting…
          </p>
        )}

        <p className="mt-4 text-center text-[11px] text-white/35">
          {multiplayerAvailable
            ? `Real-time multiplayer is enabled (${
                multiplayerProvider === 'ably' ? 'Ably' : 'Supabase'
              }).`
            : 'Demo mode active — Create/Join play vs a CPU. Add Ably or Supabase keys for live 1v1.'}
        </p>
      </Card>

      {/* Feature cards */}
      <div className="mx-auto grid w-full max-w-2xl grid-cols-2 gap-3">
        {FEATURES.map((f) => (
          <Card key={f.title} className="p-4">
            <f.icon className="mb-2 h-5 w-5 text-pitch" />
            <div className="text-sm font-semibold">{f.title}</div>
            <div className="mt-0.5 text-xs text-white/50">{f.desc}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}
