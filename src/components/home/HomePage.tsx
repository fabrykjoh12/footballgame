import { useEffect, useState, type ReactNode } from 'react';
import { useGame } from '../../context/GameProvider';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { isValidRoomCode, normalizeRoomCode } from '../../lib/roomCode';
import {
  getProfileStats,
  lifetimeAccuracy,
  resetProfileStats,
  winRate,
} from '../../lib/profileStats';
import { getCareer, divisionByTier } from '../../lib/career';
import {
  getClubIdentity,
  saveClubIdentity,
  type ClubIdentity,
} from '../../lib/clubIdentity';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { DailyRivalCard } from './DailyRivalCard';
import { StreakRewardCard } from './StreakRewardCard';
import { ClubBadge } from '../club/ClubBadge';
import { ClubIdentityModal } from '../club/ClubIdentityModal';
import { SettingsModal } from '../settings/SettingsModal';
import { CosmeticsModal } from '../cosmetics/CosmeticsModal';
import { OnboardingOverlay } from '../onboarding/OnboardingOverlay';
import { hasOnboarded } from '../../lib/onboarding';
import { TrophyCabinet } from './TrophyCabinet';
import { LeaguesCard } from '../leagues/LeaguesCard';
import {
  IconUsers,
  IconTrophy,
  IconBolt,
  IconArrowRight,
} from '../ui/icons';
import { getDailyConnectionsState, hasPlayedDailyConnectionToday } from '../../lib/dailyConnections';

export function HomePage({
  onOpenCareer,
  onOpenModes,
  onOpenCup,
  onOpenConnections,
  onOpenConnectionsDaily,
  onOpenMystery,
  onOpenOlderYounger,
  onOpenCareerPath,
  onOpenManagers,
}: {
  onOpenCareer: () => void;
  onOpenModes: () => void;
  onOpenCup: () => void;
  onOpenConnections: () => void;
  onOpenConnectionsDaily: () => void;
  onOpenMystery: () => void;
  onOpenOlderYounger: () => void;
  onOpenCareerPath: () => void;
  onOpenManagers: () => void;
}) {
  const {
    createRoom,
    joinRoom,
    playDemo,
    playDaily,
    connecting,
    error,
    multiplayerAvailable,
    multiplayerProvider,
  } = useGame();
  const [name, setName] = useLocalStorage('bk_name', '');
  const [showJoin, setShowJoin] = useState(false);
  const [code, setCode] = useState('');
  const [stats, setStats] = useState(() => getProfileStats());
  const [dailyConn] = useState(() => getDailyConnectionsState());
  const dailyConnDone = hasPlayedDailyConnectionToday(dailyConn);
  const [career] = useState(() => getCareer());
  const [club, setClub] = useState<ClubIdentity | null>(() => getClubIdentity());
  const [editingClub, setEditingClub] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCosmetics, setShowCosmetics] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => !hasOnboarded());

  const saveClub = (identity: ClubIdentity) => {
    saveClubIdentity(identity);
    setClub(identity);
    setName(identity.name); // the club name becomes the player's match name
    setEditingClub(false);
  };

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
    <div className="flex flex-1 flex-col gap-7 py-6">
      {/* Hero */}
      <div className="text-center animate-fade-in">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
          <IconBolt className="h-3.5 w-3.5 text-pitch" />
          Kahoot × Football Wordle × FIFA trivia
        </div>
        <h1 className="font-display text-4xl font-bold leading-none tracking-tight sm:text-5xl">
          <span className="text-gradient-pitch">Ball Knowledge</span>
        </h1>
        <p className="mx-auto mt-3 max-w-md text-balance text-white/60">
          1v1 football trivia. Score goals with your knowledge.
        </p>
        {/* First-run teaser: show what a finished match looks like. */}
        {!club && stats.matchesPlayed === 0 && <MatchPreviewCard />}
      </div>

      {/* Manager dashboard — identity + lifetime progress at a glance */}
      <div className="mx-auto w-full max-w-md animate-fade-in">
        <Card strong className="overflow-hidden p-0">
          {/* Header — club identity, or a nudge to create one. */}
          {club ? (
            <div className="flex items-center gap-3 p-4">
              <ClubBadge identity={club} size={52} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-display text-lg font-bold">{club.name}</div>
                <div className="truncate text-xs text-white/55">
                  {club.nickname} · {club.stadium}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setEditingClub(true)}>
                Edit
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <div className="text-sm font-semibold">Create your club</div>
                <div className="text-xs text-white/55">
                  Name, kit colours, badge — used across the whole game.
                </div>
              </div>
              <Button size="sm" onClick={() => setEditingClub(true)}>Create</Button>
            </div>
          )}

          {/* Lifetime record strip — shown once any match is played. */}
          {stats.matchesPlayed > 0 && (
            <>
              <div className="grid grid-cols-4 divide-x divide-white/[0.06] border-t border-white/[0.06]">
                <StatPill value={String(stats.matchesPlayed)} label="Played" />
                <StatPill value={`${winRate(stats)}%`} label="Win" />
                <StatPill value={`${lifetimeAccuracy(stats)}%`} label="Acc" />
                <StatPill value={String(stats.bestStreak)} label="Streak" tone="gold" />
              </div>
              <div className="flex items-center justify-between border-t border-white/[0.06] px-4 py-2">
                <span className="text-[11px] text-white/45">
                  {stats.lastTitle ? (
                    <>Last title: <span className="font-semibold text-gold">{stats.lastTitle}</span></>
                  ) : (
                    'Win matches to climb your record.'
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => setStats(resetProfileStats())}
                  className="text-[11px] text-white/25 hover:text-white/60"
                >
                  Reset
                </button>
              </div>
            </>
          )}
        </Card>
      </div>

      {editingClub && (
        <ClubIdentityModal
          initial={club}
          onSave={saveClub}
          onClose={() => setEditingClub(false)}
        />
      )}

      {/* Quick match — the primary thing to do right now */}
      <section className="mx-auto w-full max-w-md animate-rise-in [animation-delay:90ms]">
        <SectionLabel hint={multiplayerAvailable ? 'Live 1v1 ready' : 'vs CPU'}>
          Quick match
        </SectionLabel>
      <Card strong className="p-6 sm:p-7">
        <label
          htmlFor="player-name"
          className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/50"
        >
          Your name
        </label>
        <div className="relative mb-6">
          <IconUsers className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
          <input
            id="player-name"
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 18))}
            placeholder="e.g. Sara"
            autoComplete="off"
            className="input-field pl-10 text-base"
          />
        </div>

        <div className="flex flex-col gap-3">
          <Button
            size="lg"
            fullWidth
            disabled={!nameValid || connecting}
            onClick={() => playDemo(name)}
          >
            <IconBolt className="h-4 w-4" /> Play vs CPU
          </Button>

          <Button
            variant="secondary"
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
            <div className="flex flex-col gap-2.5 rounded-2xl border border-white/10 bg-ink-900/40 p-3 animate-scale-in">
              <input
                value={code}
                onChange={(e) => setCode(normalizeRoomCode(e.target.value).slice(0, 8))}
                placeholder="Room code (e.g. BK7Q2)"
                autoComplete="off"
                inputMode="text"
                aria-label="Room code"
                className="input-field text-center font-mono text-lg uppercase tracking-[0.25em] placeholder:tracking-normal"
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
      </section>

      {/* Today — the daily reasons to come back */}
      <section className="mx-auto w-full max-w-md">
        <SectionLabel hint="Back tomorrow">Today</SectionLabel>
        <div className="flex flex-col gap-3">
          <DailyRivalCard name={name} connecting={connecting} onPlay={playDaily} />
          <StreakRewardCard />
        </div>
      </section>

      {/* Continue — Career progress */}
      <section className="mx-auto w-full max-w-md">
        <SectionLabel hint="Singleplayer">{career ? 'Continue' : 'New challenge'}</SectionLabel>
        <Card className="p-4">
          <div className="mb-2 flex items-center gap-2">
            <IconTrophy className="h-5 w-5 text-pitch" />
            <h2 className="font-display text-base font-bold">Career Mode</h2>
            {career && (
              <span className="ml-auto rounded-full border border-pitch/30 bg-pitch/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-pitch">
                S{career.season} · {divisionByTier(career.tier).name}
              </span>
            )}
          </div>
          {career ? (
            <p className="text-xs leading-relaxed text-white/55">
              Season {career.season} in{' '}
              <span className="font-semibold text-pitch">
                {divisionByTier(career.tier).name}
              </span>
              . Continue your climb to the Premier League.
            </p>
          ) : (
            <p className="text-xs leading-relaxed text-white/55">
              Start in League Two and manage your club up the pyramid vs the CPU.
              Difficulty rises as you’re promoted.
            </p>
          )}
          <div className="mt-3">
            <Button fullWidth onClick={onOpenCareer}>
              {career ? 'Continue career' : 'Start a career'}{' '}
              <IconArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      </section>

      {/* Game Modes hub — compact grid of every mode */}
      <section className="mx-auto w-full max-w-md">
        <SectionLabel hint="Pick your challenge">Game modes</SectionLabel>
        <div className="grid grid-cols-2 gap-2">
          <ModeTile emoji="🔗" name="Connections" sub="Played for both clubs" tag="Puzzle" tagTone="text-pitch border-pitch/30 bg-pitch/10" onClick={onOpenConnections} />
          <ModeTile
            emoji="📅"
            name="Daily Connections"
            sub={dailyConnDone ? `Done · 🔥 ${dailyConn.streak}` : dailyConn.streak > 0 ? `🔥 ${dailyConn.streak}-day streak` : 'One puzzle a day'}
            tag={dailyConnDone ? 'Done' : 'Daily'}
            tagTone={dailyConnDone ? 'text-white/50 border-white/15 bg-white/5' : 'text-gold border-gold/30 bg-gold/10'}
            onClick={onOpenConnectionsDaily}
          />
          <ModeTile emoji="🧭" name="Career Path" sub="Guess from the clubs" tag="Solo" tagTone="text-white/60 border-white/15 bg-white/5" onClick={onOpenCareerPath} />
          <ModeTile emoji="🎂" name="Older or Younger?" sub="Birth-year Higher/Lower" tag="Solo" tagTone="text-white/60 border-white/15 bg-white/5" onClick={onOpenOlderYounger} />
          <ModeTile emoji="🎩" name="Managers" sub="Managed both clubs" tag="Solo" tagTone="text-white/60 border-white/15 bg-white/5" onClick={onOpenManagers} />
          <ModeTile emoji="🕵️" name="Mystery Duel" sub="Football Guess Who" tag="Versus" tagTone="text-sky-300 border-sky-400/30 bg-sky-400/10" onClick={onOpenMystery} />
          <ModeTile emoji="🏆" name="Cup Runs" sub="Knockout tournaments" tag="Cup" tagTone="text-gold border-gold/30 bg-gold/10" onClick={onOpenCup} />
          <ModeTile emoji="⚡" name="Arcade" sub="Survival · Time Attack" tag="Solo" tagTone="text-white/60 border-white/15 bg-white/5" onClick={onOpenModes} />
        </div>
      </section>

      {/* Achievements + leaderboard */}
      <TrophyCabinet />

      {/* Private friend leagues */}
      <LeaguesCard />

      {/* Settings, cosmetics & data */}
      <div className="mx-auto flex items-center gap-4 text-xs text-white/40">
        <button type="button" onClick={() => setShowCosmetics(true)} className="hover:text-white">
          🎨 Cosmetics
        </button>
        <button type="button" onClick={() => setShowSettings(true)} className="hover:text-white">
          ⚙ Settings &amp; data
        </button>
      </div>
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {showCosmetics && <CosmeticsModal onClose={() => setShowCosmetics(false)} />}
      {showOnboarding && (
        <OnboardingOverlay
          onCreateClub={() => setEditingClub(true)}
          onPlay={() => playDemo(name.trim() || 'You')}
          onClose={() => setShowOnboarding(false)}
        />
      )}
    </div>
  );
}

/** A decorative "matchday card" preview shown on the hero. License-free. */
function MatchPreviewCard() {
  return (
    <div className="mx-auto mt-6 w-full max-w-xs animate-rise-in [animation-delay:120ms]">
      <div className="glass relative overflow-hidden rounded-2xl border border-white/10 p-4 text-center shadow-elev-1">
        {/* Tactical-board texture behind the scoreline. */}
        <div className="grid-tactical pointer-events-none absolute inset-0 opacity-40" aria-hidden />
        <div className="relative">
        <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-gold">
          Full time
        </div>
        <div className="mt-2 flex items-center justify-center gap-2.5 font-display font-bold">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-pitch" aria-hidden />
            <span className="text-sm text-white/90">Sara FC</span>
          </span>
          <span className="nums text-xl text-pitch">3–2</span>
          <span className="flex items-center gap-1.5">
            <span className="text-sm text-white/90">Jonas United</span>
            <span className="h-2.5 w-2.5 rounded-full bg-sky-400" aria-hidden />
          </span>
        </div>
        <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-2.5 py-0.5 text-[11px] font-semibold text-gold">
          ⏱️ 90+2' Late Winner
        </div>
        <div className="mt-2 text-[11px] text-white/45">8/10 correct · Best: Transfers</div>
        </div>
        {/* Sweeping shine */}
        <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/5 to-transparent motion-safe:animate-[shine_3.2s_ease-in-out_infinite]" />
      </div>
    </div>
  );
}

/** A small dashboard section header: label + hairline + optional hint. */
function SectionLabel({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="mb-2 flex items-center gap-3">
      <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-white/55">{children}</h2>
      <span className="h-px flex-1 bg-white/[0.07]" />
      {hint && (
        <span className="text-[10px] font-medium uppercase tracking-wide text-white/35">{hint}</span>
      )}
    </div>
  );
}

/** A single figure in the manager-dashboard stat strip. */
function StatPill({
  value,
  label,
  tone = 'pitch',
}: {
  value: string;
  label: string;
  tone?: 'pitch' | 'gold';
}) {
  return (
    <div className="px-2 py-2.5 text-center">
      <div className={`nums font-display text-lg font-bold ${tone === 'gold' ? 'text-gold' : 'text-pitch'}`}>
        {value}
      </div>
      <div className="mt-0.5 text-[10px] uppercase tracking-wide text-white/40">{label}</div>
    </div>
  );
}

/** A compact tappable tile in the Game Modes grid. */
function ModeTile({
  emoji,
  name,
  sub,
  tag,
  tagTone = 'text-white/60 border-white/15 bg-white/5',
  onClick,
}: {
  emoji: string;
  name: string;
  sub: string;
  tag?: string;
  tagTone?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col items-start gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left card-hover"
    >
      <div className="flex w-full items-start justify-between gap-1">
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-pitch/10 text-lg ring-1 ring-inset ring-white/10"
          aria-hidden
        >
          {emoji}
        </span>
        {tag && (
          <span
            className={`rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${tagTone}`}
          >
            {tag}
          </span>
        )}
      </div>
      <div className="min-w-0">
        <span className="block text-sm font-semibold leading-tight text-white/90">{name}</span>
        <span className="mt-0.5 block text-[11px] leading-tight text-white/45">{sub}</span>
      </div>
      <IconArrowRight className="absolute bottom-3 right-3 h-3.5 w-3.5 text-white/0 transition-colors duration-200 group-hover:text-pitch" />
    </button>
  );
}
