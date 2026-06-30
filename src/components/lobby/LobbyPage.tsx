import { useState } from 'react';
import { useGame } from '../../context/GameProvider';
import { MATCH_MODE_LIST, durationForMode } from '../../lib/matchModes';
import { CATEGORY_OPTIONS } from '../../lib/categories';
import type { Category, Player } from '../../types/game';
import { teamName } from '../../lib/teamName';
import { matchIdentities, type TeamIdentity } from '../../lib/teamIdentity';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { InviteFriends } from '../friends/InviteFriends';
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
  const remote = serviceMode === 'remote';
  const canStart = room.players.length >= 2;
  const selectedCats = room.settings.categories ?? [];

  // Resolve the matchup by ROLE so both viewers see Host on the left, Guest on
  // the right (not "me vs them"), like a real fixture graphic.
  const hostPlayer = room.players.find((p) => p.isHost) ?? null;
  const guestPlayer = room.players.find((p) => !p.isHost) ?? null;
  const [idHost, idGuest] = matchIdentities(
    hostPlayer?.name ?? 'Home',
    guestPlayer?.name ?? 'Away',
  );

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
        <Badge tone={remote ? 'pitch' : 'muted'}>
          {remote ? (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-pitch motion-safe:animate-pulse" />
              Live multiplayer
            </>
          ) : (
            'Demo vs CPU'
          )}
        </Badge>
      </div>

      {/* Broadcast matchup card */}
      <Card strong className="relative overflow-hidden p-5 animate-rise-in">
        <div className="grid-tactical pointer-events-none absolute inset-0 opacity-[0.35]" aria-hidden />
        {/* Kit-colour wash from each touchline. */}
        <div
          className="pointer-events-none absolute inset-y-0 left-0 w-1/3 opacity-60"
          style={{ background: `linear-gradient(90deg, ${idHost.soft}, transparent)` }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-1/3 opacity-60"
          style={{ background: `linear-gradient(270deg, ${idGuest.soft}, transparent)` }}
          aria-hidden
        />

        <div className="relative">
          <div className="mb-4 text-center text-[10px] font-bold uppercase tracking-[0.3em] text-gold">
            Matchday · {canStart ? 'Ready' : 'Team sheet'}
          </div>
          <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2">
            <TeamColumn
              player={hostPlayer}
              identity={idHost}
              isYou={hostPlayer?.id === localPlayerId}
              role="Host"
            />
            <div className="flex flex-col items-center pt-3">
              <span className="font-display text-2xl font-black italic text-white/25">VS</span>
              <span className="mt-1 nums text-[10px] font-semibold uppercase tracking-wide text-white/35">
                {room.settings.questionCount} Qs
              </span>
            </div>
            {guestPlayer ? (
              <TeamColumn
                player={guestPlayer}
                identity={idGuest}
                isYou={guestPlayer.id === localPlayerId}
                role="Guest"
              />
            ) : (
              <WaitingColumn remote={remote} />
            )}
          </div>
        </div>
      </Card>

      {/* Room code — only needed to invite a human (remote). */}
      {remote && (
        <div className="lower-third px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.2em] text-white/40">
                Room code
              </div>
              <div className="nums font-mono text-3xl font-bold tracking-[0.25em] text-gradient-pitch">
                {room.roomCode}
              </div>
            </div>
            <div className="flex shrink-0 flex-col gap-1.5">
              <Button variant="secondary" size="sm" onClick={() => copy('code')}>
                {copied === 'code' ? <IconCheck className="h-4 w-4 text-pitch" /> : <IconCopy className="h-4 w-4" />}
                {copied === 'code' ? 'Copied' : 'Code'}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => copy('link')}>
                {copied === 'link' ? <IconCheck className="h-4 w-4 text-pitch" /> : <IconShare className="h-4 w-4" />}
                {copied === 'link' ? 'Copied' : 'Link'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Invite a saved friend (live multiplayer only) */}
      {remote && <InviteFriends roomCode={room.roomCode} />}

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
                onClick={() =>
                  isHost &&
                  updateSettings({ mode: mode.id, questionDurationMs: durationForMode(mode.id) })
                }
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
          {canStart ? 'Kick off' : 'Waiting for opponent…'}
        </Button>
      ) : (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-4 text-white/60">
          <span className="h-2 w-2 animate-pulse rounded-full bg-pitch" />
          Waiting for host to kick off…
        </div>
      )}
    </div>
  );
}

/** One team in the broadcast matchup: kit-coloured crest, name, role badges. */
function TeamColumn({
  player,
  identity,
  isYou,
  role,
}: {
  player: Player | null;
  identity: TeamIdentity;
  isYou: boolean;
  role: 'Host' | 'Guest';
}) {
  const name = player?.name ?? 'Player';
  const offline = player && !player.connected;
  return (
    <div className="flex min-w-0 flex-col items-center gap-2 text-center">
      <div
        className="grid h-16 w-16 place-items-center rounded-2xl font-display text-2xl font-black"
        style={{
          backgroundColor: identity.soft,
          color: identity.color,
          boxShadow: `inset 0 0 0 2px ${identity.ring}, 0 0 24px -6px ${identity.ring}`,
        }}
      >
        {name.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0">
        <div className="truncate font-display text-base font-bold leading-tight">
          {teamName(name)}
        </div>
        {/* Kit-colour underline ties the name to the crest. */}
        <div
          className="mx-auto mt-1 h-0.5 w-8 rounded-full"
          style={{ backgroundColor: identity.color }}
        />
        <div className="mt-1.5 flex flex-wrap justify-center gap-1">
          <Badge tone={role === 'Host' ? 'gold' : 'muted'}>{role}</Badge>
          {isYou && <Badge tone="pitch">You</Badge>}
          {offline && <Badge tone="danger">Offline</Badge>}
        </div>
      </div>
    </div>
  );
}

/** Empty opponent slot while we wait for a player (or the CPU) to arrive. */
function WaitingColumn({ remote }: { remote: boolean }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-2 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-2xl border border-dashed border-white/15 bg-white/[0.03] text-white/30">
        <IconUsers className="h-6 w-6" />
      </div>
      <div className="min-w-0">
        <div className="truncate font-display text-base font-bold leading-tight text-white/45">
          {remote ? 'Open slot' : 'CPU'}
        </div>
        <div className="mt-1.5 flex items-center justify-center gap-1.5 text-[11px] text-white/40">
          <span className="h-1.5 w-1.5 rounded-full bg-pitch motion-safe:animate-pulse" />
          {remote ? 'Waiting to join…' : 'Joining…'}
        </div>
      </div>
    </div>
  );
}
