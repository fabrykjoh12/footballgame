import { useEffect, useState, type ReactNode } from 'react';
import { useGame } from '../../context/GameProvider';
import { useAuth } from '../../context/AuthProvider';
import { getMyIdentity, formatFriendCode } from '../../lib/friends';
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
import { QuestsCard } from './QuestsCard';
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

export function HomePage({ onOpenCareer }: { onOpenCareer: () => void }) {
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

  // One identity: with a club, you always play as the club (the input hides);
  // without one, the typed name is used. @username + friend code surface on
  // the manager strip so all identity signals live in one place.
  const { user } = useAuth();
  const [myCode] = useState(() => getMyIdentity().friendCode);
  const playName = club?.name.trim() ? club.name : name;
  const nameValid = playName.trim().length >= 1;
  const codeValid = isValidRoomCode(code);

  return (
    <div className="flex flex-1 flex-col gap-10 py-8">
      {/* Masthead */}
      <header className="animate-fade-in">
        <h1 className="text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
          Ball Knowledge
        </h1>
        <p className="mt-2 max-w-lg text-[15px] leading-relaxed text-ink-600">
          1v1 football quiz duels. Ten questions become one scoreline — play a
          friend or the CPU.
        </p>
        {stats.matchesPlayed > 0 && (
          <dl className="mt-5 flex gap-6">
            <LedgerRow k="Played" v={String(stats.matchesPlayed)} />
            <LedgerRow k="Win rate" v={`${winRate(stats)}%`} />
            <LedgerRow k="Best streak" v={String(stats.bestStreak)} />
          </dl>
        )}
        {!club && stats.matchesPlayed === 0 && <MatchPreviewCard />}
      </header>

      {/* Manager dashboard — identity + lifetime progress at a glance */}
      <div className="mx-auto w-full max-w-md animate-fade-in">
        <Card strong className="overflow-hidden p-0">
          {/* Header — club identity, or a nudge to create one. */}
          {club ? (
            <div className="flex items-center gap-3 p-4">
              <ClubBadge identity={club} size={52} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-lg font-bold">{club.name}</div>
                <div className="truncate text-xs text-ink-500">
                  {club.nickname} · {club.stadium}
                </div>
                <div className="truncate text-[11px] text-ink-500">
                  {user?.username ? `@${user.username} · ` : ''}
                  <span className="font-mono">{formatFriendCode(myCode)}</span>
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
                <div className="text-xs text-ink-500">
                  Name, kit colours, badge — used across the whole game.
                </div>
              </div>
              <Button size="sm" onClick={() => setEditingClub(true)}>Create</Button>
            </div>
          )}

          {/* Accuracy + last title — the rest lives in the masthead ledger. */}
          {stats.matchesPlayed > 0 && (
            <div className="flex items-center justify-between border-t-[0.5px] border-black/[0.07] px-4 py-2.5">
              <span className="font-mono text-[11px] text-ink-600">
                {lifetimeAccuracy(stats)}% accuracy
                {stats.lastTitle ? (
                  <> · last title <span className="text-gold">{stats.lastTitle}</span></>
                ) : null}
              </span>
              <button
                type="button"
                onClick={() => setStats(resetProfileStats())}
                className="font-mono text-[11px] text-ink-500 hover:text-ink-600"
              >
                reset
              </button>
            </div>
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
        {club ? (
          <div className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-black/10 bg-[#f6f6f5] px-3.5 py-2.5">
            <div className="flex min-w-0 items-center gap-2.5">
              <ClubBadge identity={club} size={30} />
              <div className="min-w-0">
                <div className="text-xs text-ink-500">Playing as</div>
                <div className="truncate text-sm font-semibold">{club.name}</div>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setEditingClub(true)}>
              Edit
            </Button>
          </div>
        ) : (
          <>
            <label
              htmlFor="player-name"
              className="mb-2 block text-sm font-medium text-ink-600"
            >
              Your name
            </label>
            <div className="relative mb-6">
              <IconUsers className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <input
                id="player-name"
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 18))}
                placeholder="e.g. Sara"
                autoComplete="off"
                className="input-field pl-10 text-base"
              />
            </div>
          </>
        )}

        <div className="flex flex-col gap-3">
          <Button
            size="lg"
            fullWidth
            disabled={!nameValid || connecting}
            onClick={() => playDemo(playName)}
          >
            <IconBolt className="h-4 w-4" /> Play vs CPU
          </Button>

          <Button
            variant="secondary"
            size="lg"
            fullWidth
            disabled={!nameValid || connecting}
            onClick={() => createRoom(playName)}
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
            <div className="flex flex-col gap-2.5 rounded-2xl border border-black/10 bg-[#f6f6f5] p-3 animate-scale-in">
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
                  onClick={() => joinRoom(code, playName)}
                >
                  Join
                </Button>
              </div>
            </div>
          )}

        </div>

        {!club && !nameValid && (
          <p className="mt-3 text-center text-xs text-ink-500">
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

        <p className="mt-4 text-center text-[11px] text-ink-500">
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
          <DailyRivalCard name={playName} connecting={connecting} onPlay={playDaily} />
          <QuestsCard />
          <StreakRewardCard />
        </div>
      </section>

      {/* Continue — Career progress */}
      <section className="mx-auto w-full max-w-md">
        <SectionLabel hint="Singleplayer">{career ? 'Continue' : 'New challenge'}</SectionLabel>
        <Card className="p-4">
          <div className="mb-2 flex items-center gap-2">
            <IconTrophy className="h-5 w-5 text-gold" />
            <h2 className="text-[15px] font-bold text-ink-900">Career mode</h2>
            {career && (
              <span className="nums ml-auto rounded-full border border-black/10 bg-black/[0.04] px-2 py-0.5 text-[11px] font-medium text-ink-600">
                S{career.season} · {divisionByTier(career.tier).name}
              </span>
            )}
          </div>
          {career ? (
            <p className="text-xs leading-relaxed text-ink-500">
              Season {career.season} in{' '}
              <span className="font-semibold text-pitch">
                {divisionByTier(career.tier).name}
              </span>
              . Continue your climb to the Premier League.
            </p>
          ) : (
            <p className="text-xs leading-relaxed text-ink-500">
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

      {/* Achievements + leaderboard */}
      <TrophyCabinet />

      {/* Private friend leagues */}
      <LeaguesCard />

      {/* Settings, cosmetics & data */}
      <div className="mx-auto flex items-center gap-4 text-xs text-ink-500">
        <button type="button" onClick={() => setShowCosmetics(true)} className="hover:text-ink-900">
          🎨 Cosmetics
        </button>
        <button type="button" onClick={() => setShowSettings(true)} className="hover:text-ink-900">
          ⚙ Settings &amp; data
        </button>
      </div>
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {showCosmetics && <CosmeticsModal onClose={() => setShowCosmetics(false)} />}
      {showOnboarding && (
        <OnboardingOverlay
          onCreateClub={() => setEditingClub(true)}
          onPlay={() => playDemo(playName.trim() || 'You')}
          onClose={() => setShowOnboarding(false)}
        />
      )}
    </div>
  );
}

/** A small "final score" preview shown to first-time visitors. */
function MatchPreviewCard() {
  return (
    <div className="mt-5 w-full max-w-xs animate-fade-in">
      <div className="glass rounded-2xl p-4">
        <div className="text-xs font-medium text-ink-500">Full time</div>
        <div className="mt-1.5 flex items-center gap-2.5 font-bold">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-danger" aria-hidden />
            <span className="text-sm text-ink-900">Sara FC</span>
          </span>
          <span className="nums text-xl">3–2</span>
          <span className="flex items-center gap-1.5">
            <span className="text-sm text-ink-900">Jonas United</span>
            <span className="h-2.5 w-2.5 rounded-full bg-sky-400" aria-hidden />
          </span>
        </div>
        <div className="mt-1.5 text-xs text-ink-500">
          Won 90+2&rsquo; · 8/10 correct · best category Transfers
        </div>
      </div>
    </div>
  );
}

/**
 * Section header — a serif label with a mono index, sat on a hairline rule.
 * Asymmetric on purpose: heading left, hint right.
 */
function SectionLabel({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="text-lg font-bold tracking-tight text-ink-900">{children}</h2>
      {hint && <span className="text-xs text-ink-500">{hint}</span>}
    </div>
  );
}

/** One stat: label above, tabular value below. */
function LedgerRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-ink-500">{k}</dt>
      <dd className="nums mt-0.5 text-xl font-bold text-ink-900">{v}</dd>
    </div>
  );
}
