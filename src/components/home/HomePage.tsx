import { useEffect, useState, type ReactNode } from 'react';
import { useGame } from '../../context/GameProvider';
import { useAuth } from '../../context/AuthProvider';
import { useNav } from '../../context/NavProvider';
import { getMyIdentity, formatFriendCode } from '../../lib/friends';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { isValidRoomCode, normalizeRoomCode } from '../../lib/roomCode';
import { getProfileStats, winRate } from '../../lib/profileStats';
import { getCareer, divisionByTier } from '../../lib/career';
import {
  getClubIdentity,
  saveClubIdentity,
  type ClubIdentity,
} from '../../lib/clubIdentity';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { DailyRivalCard } from './DailyRivalCard';
import { QuestsCard } from './QuestsCard';
import { StreakRewardCard } from './StreakRewardCard';
import { ClubBadge } from '../club/ClubBadge';
import { ClubIdentityModal } from '../club/ClubIdentityModal';
import { SettingsModal } from '../settings/SettingsModal';
import { CosmeticsModal } from '../cosmetics/CosmeticsModal';
import { OnboardingOverlay } from '../onboarding/OnboardingOverlay';
import { hasOnboarded } from '../../lib/onboarding';
import { TrophyCabinet } from './TrophyCabinet';
import { LeaguesCard } from '../leagues/LeaguesCard';
import { IconUsers, IconBolt } from '../ui/icons';

export function HomePage() {
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
  const { navigate } = useNav();
  const [name, setName] = useLocalStorage('bk_name', '');
  const [showJoin, setShowJoin] = useState(false);
  const [code, setCode] = useState('');
  const [stats] = useState(() => getProfileStats());
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

  const { user } = useAuth();
  const [myCode] = useState(() => getMyIdentity().friendCode);
  const playName = club?.name.trim() ? club.name : name;
  const nameValid = playName.trim().length >= 1;
  const codeValid = isValidRoomCode(code);

  return (
    <div className="flex flex-1 flex-col gap-9 py-7">
      {/* Header */}
      <header className="animate-fade-in">
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Football quizzes, games &amp; trivia
        </h1>
        <p className="mt-1.5 text-[15px] text-white/55">
          1v1 duels, daily puzzles and solo challenges. Points become goals.
        </p>
        {/* Identity + record, on one compact line */}
        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          {club ? (
            <button
              type="button"
              onClick={() => setEditingClub(true)}
              className="flex items-center gap-2 rounded-full border border-white/10 bg-ink-800 py-1 pl-1 pr-3 text-sm hover:bg-ink-700"
            >
              <ClubBadge identity={club} size={24} />
              <span className="font-semibold text-white">{club.name}</span>
              <span className="text-white/40">·</span>
              <span className="font-mono text-xs text-white/50">{formatFriendCode(myCode)}</span>
            </button>
          ) : (
            <Button size="sm" variant="secondary" onClick={() => setEditingClub(true)}>
              + Create your club
            </Button>
          )}
          {stats.matchesPlayed > 0 && (
            <span className="nums text-xs text-white/45">
              {stats.matchesPlayed} played · {winRate(stats)}% won · best streak {stats.bestStreak}
            </span>
          )}
          {user?.username && <span className="text-xs text-white/40">@{user.username}</span>}
        </div>
      </header>

      {/* Play — the primary action */}
      <Section title="Play">
        <Card className="p-4 sm:p-5">
          {!club && (
            <div className="relative mb-3">
              <IconUsers className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
              <input
                id="player-name"
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 18))}
                placeholder="Your name (e.g. Sara)"
                autoComplete="off"
                aria-label="Your name"
                className="input-field pl-10"
              />
            </div>
          )}
          <div className="grid gap-2.5 sm:grid-cols-3">
            <Button size="lg" disabled={!nameValid || connecting} onClick={() => playDemo(playName)}>
              <IconBolt className="h-4 w-4" /> Play vs CPU
            </Button>
            <Button variant="secondary" size="lg" disabled={!nameValid || connecting} onClick={() => createRoom(playName)}>
              Create room
            </Button>
            <Button variant="secondary" size="lg" disabled={connecting} onClick={() => setShowJoin((s) => !s)}>
              Join room
            </Button>
          </div>

          {showJoin && (
            <div className="mt-2.5 flex flex-col gap-2.5 rounded-lg border border-white/10 bg-ink-700 p-3 animate-scale-in sm:flex-row">
              <input
                value={code}
                onChange={(e) => setCode(normalizeRoomCode(e.target.value).slice(0, 8))}
                placeholder="Room code"
                autoComplete="off"
                aria-label="Room code"
                className="input-field flex-1 text-center font-mono uppercase tracking-[0.25em] placeholder:tracking-normal"
              />
              <Button disabled={!nameValid || !codeValid || connecting} onClick={() => joinRoom(code, playName)}>
                Join
              </Button>
            </div>
          )}

          {error && (
            <p role="alert" className="mt-3 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-center text-sm text-danger">
              {error}
            </p>
          )}
          {connecting ? (
            <p className="mt-2.5 text-center text-sm text-pitch animate-pulse">Connecting…</p>
          ) : (
            !nameValid && <p className="mt-2.5 text-xs text-white/40">Enter a name to start.</p>
          )}
          <p className="mt-2 text-[11px] text-white/35">
            {multiplayerAvailable
              ? `Live 1v1 enabled (${multiplayerProvider === 'ably' ? 'Ably' : 'Supabase'}).`
              : 'Demo mode — rooms play vs a CPU. Add Ably/Supabase keys for live 1v1.'}
          </p>
        </Card>
      </Section>

      {/* Versus modes */}
      <Section title="Head to head">
        <ModeGrid>
          <ModeCard emoji="🔍" title="The Scout" sub="Deduce the secret rule" badge="Versus" color="#7c5cff" onClick={() => navigate('scout')} />
          <ModeCard emoji="🕵️" title="Mystery Duel" sub="Football Guess Who" badge="Versus" color="#2f81f7" onClick={() => navigate('mystery')} />
        </ModeGrid>
      </Section>

      {/* Daily */}
      <Section title="Today">
        <div className="flex flex-col gap-2.5">
          <DailyRivalCard name={playName} connecting={connecting} onPlay={playDaily} />
          <ModeGrid>
            <ModeCard emoji="📅" title="Daily Connections" sub="One puzzle a day" badge="Daily" color="#e0b23c" onClick={() => navigate('connectionsDaily')} />
            <ModeCard emoji="🔎" title="Daily Scout" sub="Crack today’s rule" badge="Daily" color="#20b869" onClick={() => navigate('scoutDaily')} />
          </ModeGrid>
          <QuestsCard />
          <StreakRewardCard />
        </div>
      </Section>

      {/* Solo games */}
      <Section title="Solo games">
        <ModeGrid>
          <ModeCard emoji="🔗" title="Connections" sub="A player for both clubs" color="#2bd576" onClick={() => navigate('connections')} />
          <ModeCard emoji="🧭" title="Career Path" sub="Guess from the clubs" color="#f06595" onClick={() => navigate('careerPath')} />
          <ModeCard emoji="🎂" title="Older or Younger?" sub="Birth-year higher/lower" color="#fd7e14" onClick={() => navigate('olderYounger')} />
          <ModeCard emoji="🎩" title="Managers" sub="A manager of both clubs" color="#9775fa" onClick={() => navigate('managers')} />
          <ModeCard emoji="⚡" title="Arcade" sub="Survival · Time Attack" color="#22b8cf" onClick={() => navigate('modes')} />
        </ModeGrid>
      </Section>

      {/* Career & cups */}
      <Section title="Compete">
        <ModeGrid>
          <ModeCard
            emoji="🏟️"
            title="Career"
            sub={career ? `S${career.season} · ${divisionByTier(career.tier).name}` : 'Climb the pyramid'}
            badge={career ? 'Continue' : undefined}
            color="#4c6ef5"
            onClick={() => navigate('career')}
          />
          <ModeCard emoji="🏆" title="Cup Runs" sub="Knockout tournaments" color="#e0b23c" onClick={() => navigate('cup')} />
        </ModeGrid>
      </Section>

      {/* Progress */}
      <TrophyCabinet />
      <LeaguesCard />

      <div className="flex items-center gap-4 text-xs text-white/45">
        <button type="button" onClick={() => setShowCosmetics(true)} className="hover:text-white">
          Cosmetics
        </button>
        <button type="button" onClick={() => setShowSettings(true)} className="hover:text-white">
          Settings &amp; data
        </button>
      </div>

      {editingClub && (
        <ClubIdentityModal initial={club} onSave={saveClub} onClose={() => setEditingClub(false)} />
      )}
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

/** A labelled section with a small muted header. */
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="animate-fade-in">
      <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.15em] text-white/40">{title}</h2>
      {children}
    </section>
  );
}

/** Responsive 2-column grid for mode cards. */
function ModeGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-2.5 sm:grid-cols-2">{children}</div>;
}

/**
 * A game-mode card: a colourful thumbnail tile + title + one-line description,
 * the clean playfootball-style catalogue row.
 */
function ModeCard({
  emoji,
  title,
  sub,
  badge,
  color,
  onClick,
}: {
  emoji: string;
  title: string;
  sub: string;
  badge?: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-3 rounded-xl border border-white/[0.06] bg-ink-800 p-2.5 text-left transition-colors hover:bg-ink-700"
    >
      <span
        className="grid h-14 w-14 shrink-0 place-items-center rounded-lg text-2xl"
        style={{ background: `${color} linear-gradient(155deg, rgba(255,255,255,0.22), rgba(0,0,0,0.14))` }}
        aria-hidden
      >
        {emoji}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-[15px] font-bold text-white">{title}</span>
          {badge && (
            <span className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white/70">
              {badge}
            </span>
          )}
        </span>
        <span className="mt-0.5 block truncate text-xs text-white/55">{sub}</span>
      </span>
    </button>
  );
}
