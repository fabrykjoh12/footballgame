import { useState } from 'react';
import { useGame } from '../../context/GameProvider';
import { MATCH_MODE_LIST } from '../../lib/matchModes';
import { CATEGORY_OPTIONS } from '../../lib/categories';
import type { Category } from '../../types/game';
import { teamName } from '../../lib/teamName';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { IconCopy, IconCheck, IconBack, IconUsers, IconShare } from '../ui/icons';

export function LobbyPage() {
  const {
    room,
    localPlayerId,
    isHost,
    serviceMode,
    updateSettings,
    startMatch,
    leaveRoom,
  } = useGame();
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);

  if (!room) return null;
  const opponent = room.players.find((p) => p.id !== localPlayerId);
  const canStart = room.players.length >= 2;
  const selectedCats = room.settings.categories ?? [];

  const toggleCategory = (id: Category) => {
    if (!isHost) return;
    const set = new Set(selectedCats);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    void updateSettings({ categories: Array.from(set) });
  };

  const copy = async (kind: 'code' | 'link') => {
    const text =
      kind === 'code'
        ? room.roomCode
        : `${window.location.origin}${window.location.pathname}?room=${room.roomCode}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      /* clipboard may be blocked; ignore */
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-5 py-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={leaveRoom}>
          <IconBack className="h-4 w-4" /> Leave
        </Button>
        <Badge tone={serviceMode === 'remote' ? 'pitch' : 'muted'}>
          {serviceMode === 'remote' ? 'Live multiplayer' : 'Demo vs CPU'}
        </Badge>
      </div>

      {/* Room code */}
      <Card strong className="p-5 text-center">
        <div className="text-xs uppercase tracking-[0.2em] text-white/40">
          Room code
        </div>
        <div className="my-2 font-mono text-5xl font-bold tracking-[0.3em] text-gradient-pitch">
          {room.roomCode}
        </div>
        <div className="flex justify-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => copy('code')}>
            {copied === 'code' ? <IconCheck className="h-4 w-4 text-pitch" /> : <IconCopy className="h-4 w-4" />}
            {copied === 'code' ? 'Copied' : 'Copy code'}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => copy('link')}>
            {copied === 'link' ? <IconCheck className="h-4 w-4 text-pitch" /> : <IconShare className="h-4 w-4" />}
            {copied === 'link' ? 'Copied' : 'Copy link'}
          </Button>
        </div>
        <p className="mt-3 text-xs text-white/40">
          {serviceMode === 'remote'
            ? 'Share this code with a friend to join your match.'
            : 'A CPU opponent will join shortly so you can play right now.'}
        </p>
      </Card>

      {/* Players */}
      <div className="grid grid-cols-2 gap-3">
        <PlayerSlot
          name={room.players.find((p) => p.isHost)?.name}
          isYou={room.players.find((p) => p.isHost)?.id === localPlayerId}
          host
        />
        {opponent || room.players.length >= 2 ? (
          <PlayerSlot
            name={(opponent ?? room.players[1])?.name}
            isYou={(opponent ?? room.players[1])?.id === localPlayerId}
          />
        ) : (
          <WaitingSlot />
        )}
      </div>

      {/* Match settings */}
      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-white/70">
            Match mode
          </h2>
          {!isHost && (
            <span className="text-xs text-white/40">Chosen by host</span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          {MATCH_MODE_LIST.map((mode) => {
            const selected = room.settings.mode === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                disabled={!isHost}
                onClick={() => isHost && updateSettings({ mode: mode.id })}
                aria-pressed={selected}
                className={[
                  'answer-press rounded-xl border p-3 text-left transition-colors',
                  selected
                    ? 'border-pitch/60 bg-pitch/10 shadow-glow'
                    : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]',
                  !isHost ? 'cursor-default opacity-90' : '',
                ].join(' ')}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{mode.label}</span>
                  {selected && (
                    <span className="text-pitch">
                      <IconCheck className="h-4 w-4" />
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-xs text-white/50">{mode.description}</div>
              </button>
            );
          })}
        </div>
        {/* Topics (soft filter) */}
        <div className="mt-4 border-t border-white/10 pt-3">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-white/70">
              Topics
            </h3>
            <span className="text-xs text-white/40">
              {selectedCats.length === 0 ? 'All topics' : `${selectedCats.length} selected`}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_OPTIONS.map((c) => {
              const on = selectedCats.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  disabled={!isHost}
                  onClick={() => toggleCategory(c.id)}
                  aria-pressed={on}
                  className={[
                    'answer-press rounded-full border px-3 py-1.5 text-xs font-medium',
                    on
                      ? 'border-pitch/60 bg-pitch/15 text-pitch'
                      : 'border-white/10 bg-white/[0.03] text-white/55 hover:bg-white/[0.06]',
                    !isHost ? 'cursor-default opacity-90' : '',
                  ].join(' ')}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
          {isHost && (
            <p className="mt-2 text-[11px] leading-relaxed text-white/35">
              Leave empty for all topics. Picks lean toward your choices and top up
              if a topic runs short.
            </p>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-white/40">
          <Badge tone="muted">{room.settings.questionCount} questions</Badge>
          <Badge tone="muted">{room.settings.questionDurationMs / 1000}s each</Badge>
          <Badge tone="muted">6 mini-games mixed in</Badge>
        </div>
      </Card>

      {/* Start / waiting */}
      {isHost ? (
        <Button size="lg" fullWidth disabled={!canStart} onClick={startMatch}>
          {canStart ? 'Start Match' : 'Waiting for opponent…'}
        </Button>
      ) : (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-4 text-white/60">
          <span className="h-2 w-2 animate-pulse rounded-full bg-pitch" />
          Waiting for host to start…
        </div>
      )}
    </div>
  );
}

function PlayerSlot({
  name,
  isYou,
  host = false,
}: {
  name?: string;
  isYou?: boolean;
  host?: boolean;
}) {
  return (
    <Card className="flex flex-col items-center gap-2 p-4 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-pitch/15 text-lg font-bold text-pitch ring-1 ring-pitch/30">
        {(name ?? '?').charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0">
        <div className="truncate font-semibold">{name ? teamName(name) : 'Player'}</div>
        <div className="mt-1 flex justify-center gap-1.5">
          {host && <Badge tone="gold">Host</Badge>}
          {isYou && <Badge tone="pitch">You</Badge>}
        </div>
      </div>
    </Card>
  );
}

function WaitingSlot() {
  return (
    <Card className="flex flex-col items-center justify-center gap-2 border-dashed p-4 text-center text-white/40">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-white/5 ring-1 ring-white/10">
        <IconUsers className="h-5 w-5" />
      </div>
      <div className="text-sm">Waiting for a player…</div>
    </Card>
  );
}
