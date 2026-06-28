import { useEffect, useState } from 'react';
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
  IconRoute,
  IconScale,
  IconTrophy,
  IconBolt,
  IconArrowRight,
  IconCheck,
} from '../ui/icons';
import { getDailyConnectionsState, hasPlayedDailyConnectionToday } from '../../lib/dailyConnections';

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

export function HomePage({
  onOpenCareer,
  onOpenModes,
  onOpenCup,
  onOpenConnections,
  onOpenConnectionsDaily,
  onOpenMystery,
  onOpenOlderYounger,
}: {
  onOpenCareer: () => void;
  onOpenModes: () => void;
  onOpenCup: () => void;
  onOpenConnections: () => void;
  onOpenConnectionsDaily: () => void;
  onOpenMystery: () => void;
  onOpenOlderYounger: () => void;
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
    <div className="flex flex-1 flex-col justify-center gap-8 py-6">
      {/* Hero */}
      <div className="text-center animate-fade-in">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
          <IconBolt className="h-3.5 w-3.5 text-pitch" />
          Kahoot × Football Wordle × FIFA trivia
        </div>
        <h1 className="font-display text-5xl font-bold leading-none tracking-tight sm:text-6xl">
          <span className="text-gradient-pitch">Ball Knowledge</span>
        </h1>
        <p className="mx-auto mt-4 max-w-md text-balance text-white/60">
          1v1 football trivia. Score goals with your knowledge.
        </p>
        <MatchPreviewCard />
      </div>

      {/* Your Club */}
      <Card className="mx-auto w-full max-w-md p-4 animate-fade-in">
        {club ? (
          <div className="flex items-center gap-3">
            <ClubBadge identity={club} size={52} />
            <div className="min-w-0 flex-1">
              <div className="truncate font-display text-lg font-bold">{club.name}</div>
              <div className="truncate text-xs text-white/55">
                {club.nickname} · {club.stadium}
              </div>
            </div>
            <Button variant="ghost" onClick={() => setEditingClub(true)}>
              Edit
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Create your club</div>
              <div className="text-xs text-white/55">
                Name, kit colours, badge — used across the whole game.
              </div>
            </div>
            <Button onClick={() => setEditingClub(true)}>Create</Button>
          </div>
        )}
      </Card>

      {editingClub && (
        <ClubIdentityModal
          initial={club}
          onSave={saveClub}
          onClose={() => setEditingClub(false)}
        />
      )}

      {/* Entry card */}
      <Card
        strong
        className="mx-auto w-full max-w-md p-6 animate-rise-in [animation-delay:90ms] sm:p-7"
      >
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

      {/* Daily Rival Match */}
      <DailyRivalCard name={name} connecting={connecting} onPlay={playDaily} />

      {/* Career Mode */}
      <Card className="mx-auto w-full max-w-md p-4 animate-fade-in">
        <div className="mb-2 flex items-center gap-2">
          <IconTrophy className="h-5 w-5 text-pitch" />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-white/80">
            Career Mode
          </h2>
          <span className="ml-auto rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white/45">
            Singleplayer
          </span>
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

      {/* Lifetime record (local) */}
      {stats.matchesPlayed > 0 && (
        <Card className="mx-auto w-full max-w-md p-4 animate-fade-in">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-white/70">
              Your record
            </h2>
            <button
              type="button"
              onClick={() => setStats(resetProfileStats())}
              className="text-[11px] text-white/30 hover:text-white/60"
            >
              Reset
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <ProfileStat value={String(stats.matchesPlayed)} label="Played" />
            <ProfileStat value={`${winRate(stats)}%`} label="Win rate" />
            <ProfileStat value={`${lifetimeAccuracy(stats)}%`} label="Accuracy" />
            <ProfileStat value={String(stats.bestStreak)} label="Streak" />
          </div>
          {stats.lastTitle && (
            <div className="mt-3 text-center text-xs text-white/45">
              Last title:{' '}
              <span className="font-semibold text-gold">{stats.lastTitle}</span>
            </div>
          )}
        </Card>
      )}

      {/* Game Modes (solo arcade) */}
      <Card className="mx-auto w-full max-w-md p-4 animate-fade-in">
        <div className="mb-2 flex items-center gap-2">
          <IconBolt className="h-5 w-5 text-pitch" />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-white/80">
            Game Modes
          </h2>
          <span className="ml-auto rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white/45">
            Singleplayer
          </span>
        </div>
        <p className="text-xs leading-relaxed text-white/55">
          Solo challenges: <span className="font-semibold text-white/75">Survival</span> (one life,
          rising difficulty), <span className="font-semibold text-white/75">Time Attack</span> (60s
          sprint) and <span className="font-semibold text-white/75">The Gauntlet</span> (one of every
          mini-game).
        </p>
        <div className="mt-3">
          <Button fullWidth onClick={onOpenModes}>
            Browse modes <IconArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      {/* Connections (name a player who played for both clubs) */}
      <Card className="mx-auto w-full max-w-md p-4 animate-fade-in">
        <div className="mb-2 flex items-center gap-2">
          <IconRoute className="h-5 w-5 text-pitch" />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-white/80">
            Connections
          </h2>
          <span className="ml-auto rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white/45">
            Singleplayer
          </span>
        </div>
        <p className="text-xs leading-relaxed text-white/55">
          Two clubs, one answer: <span className="font-semibold text-white/75">type a player who
          turned out for both</span>. Ten puzzles, ramping from easy to nightmare — surnames are fine.
        </p>
        <div className="mt-3 flex flex-col gap-2">
          <Button fullWidth onClick={onOpenConnections}>
            Play Connections <IconArrowRight className="h-4 w-4" />
          </Button>
          {dailyConnDone ? (
            <div className="flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] py-2 text-xs text-white/55">
              <IconCheck className="h-4 w-4 text-pitch" />
              Daily done — 🔥 {dailyConn.streak} day{dailyConn.streak === 1 ? '' : 's'} · back tomorrow
            </div>
          ) : (
            <Button variant="secondary" fullWidth onClick={onOpenConnectionsDaily}>
              <IconBolt className="h-4 w-4" /> Daily puzzle
              {dailyConn.streak > 0 && <span className="ml-1 text-gold">🔥 {dailyConn.streak}</span>}
            </Button>
          )}
        </div>
      </Card>

      {/* Older or Younger? (birth-year survival) */}
      <Card className="mx-auto w-full max-w-md p-4 animate-fade-in">
        <div className="mb-2 flex items-center gap-2">
          <span aria-hidden className="text-lg">🎂</span>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-white/80">
            Older or Younger?
          </h2>
          <span className="ml-auto rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white/45">
            Singleplayer
          </span>
        </div>
        <p className="text-xs leading-relaxed text-white/55">
          Higher/Lower with footballers: <span className="font-semibold text-white/75">guess if the next
          player is older or younger</span>. How long a streak can you survive?
        </p>
        <div className="mt-3">
          <Button fullWidth onClick={onOpenOlderYounger}>
            Play Older or Younger? <IconArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      {/* Mystery Player Duel (deduction mode) */}
      <Card className="mx-auto w-full max-w-md p-4 animate-fade-in">
        <div className="mb-2 flex items-center gap-2">
          <span aria-hidden className="text-lg">🕵️</span>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-white/80">
            Mystery Player Duel
          </h2>
          <span className="ml-auto rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white/45">
            1v1 · CPU
          </span>
        </div>
        <p className="text-xs leading-relaxed text-white/55">
          Football Guess Who. Both pick any player in secret, then ask yes/no
          questions to unmask your opponent’s pick. <span className="font-semibold text-white/75">Pick anyone — let’s
          see if your friend really knows ball.</span>
        </p>
        <div className="mt-3">
          <Button fullWidth onClick={onOpenMystery}>
            Start a duel <IconArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      {/* Cup Runs (themed knockout tournaments) */}
      <Card className="mx-auto w-full max-w-md p-4 animate-fade-in">
        <div className="mb-2 flex items-center gap-2">
          <IconTrophy className="h-5 w-5 text-gold" />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-white/80">
            Cup Runs
          </h2>
          <span className="ml-auto rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white/45">
            Singleplayer
          </span>
        </div>
        <p className="text-xs leading-relaxed text-white/55">
          Themed knockout tournaments — the <span className="font-semibold text-white/75">Champions
          Run</span>, <span className="font-semibold text-white/75">World Cup Dream</span> and a quick{' '}
          <span className="font-semibold text-white/75">Cup Sprint</span>. Win every tie to lift the
          trophy.
        </p>
        <div className="mt-3">
          <Button fullWidth onClick={onOpenCup}>
            Enter a cup <IconArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      {/* Achievements + leaderboard */}
      <TrophyCabinet />

      {/* Private friend leagues */}
      <LeaguesCard />

      {/* Feature cards */}
      <div className="mx-auto grid w-full max-w-2xl grid-cols-2 gap-3 animate-fade-in [animation-delay:200ms]">
        {FEATURES.map((f) => (
          <Card key={f.title} className="p-4">
            <f.icon className="mb-2 h-5 w-5 text-pitch" />
            <div className="text-sm font-semibold">{f.title}</div>
            <div className="mt-0.5 text-xs text-white/50">{f.desc}</div>
          </Card>
        ))}
      </div>

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
        <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-gold">
          Full time
        </div>
        <div className="mt-2 flex items-center justify-center gap-2.5 font-display font-bold">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-pitch" aria-hidden />
            <span className="text-sm text-white/90">Sara FC</span>
          </span>
          <span className="text-xl text-pitch">3–2</span>
          <span className="flex items-center gap-1.5">
            <span className="text-sm text-white/90">Jonas United</span>
            <span className="h-2.5 w-2.5 rounded-full bg-sky-400" aria-hidden />
          </span>
        </div>
        <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-2.5 py-0.5 text-[11px] font-semibold text-gold">
          ⏱️ 90+2' Late Winner
        </div>
        <div className="mt-2 text-[11px] text-white/45">8/10 correct · Best: Transfers</div>
        {/* Sweeping shine */}
        <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/5 to-transparent motion-safe:animate-[shine_3.2s_ease-in-out_infinite]" />
      </div>
    </div>
  );
}

function ProfileStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2 text-center">
      <div className="font-display text-xl font-bold text-pitch">{value}</div>
      <div className="mt-0.5 text-[10px] uppercase tracking-wide text-white/40">
        {label}
      </div>
    </div>
  );
}
