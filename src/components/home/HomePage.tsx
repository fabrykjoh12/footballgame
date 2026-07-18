import { useEffect, useState } from 'react';
import { Zap, Users, KeyRound, Palette, Settings } from 'lucide-react';
import { useGame } from '../../context/GameProvider';
import { useNav } from '../../context/NavProvider';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { isValidRoomCode, normalizeRoomCode } from '../../lib/roomCode';
import { getProfileStats } from '../../lib/profileStats';
import { playerLevel } from '../../lib/playerLevel';
import { currentStreak } from '../../lib/streakRewards';
import { getCareer } from '../../lib/career';
import { getClubIdentity, saveClubIdentity, type ClubIdentity } from '../../lib/clubIdentity';
import { trackEvent } from '../../lib/analytics';
import type { View } from '../../lib/viewRoute';
import { PrimaryButton, SecondaryButton, Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { DailyRivalCard } from './DailyRivalCard';
import { QuestsCard } from './QuestsCard';
import { StreakRewardCard } from './StreakRewardCard';
import { TrophyCabinet } from './TrophyCabinet';
import { ModeStatsCard } from './ModeStatsCard';
import { LeaguesCard } from '../leagues/LeaguesCard';
import { ClubIdentityModal } from '../club/ClubIdentityModal';
import { SettingsModal } from '../settings/SettingsModal';
import { CosmeticsModal } from '../cosmetics/CosmeticsModal';
import { OnboardingOverlay } from '../onboarding/OnboardingOverlay';
import { hasOnboarded } from '../../lib/onboarding';
import { SectionHeader } from '../dashboard/SectionHeader';
import { GameModeCard } from '../dashboard/GameModeCard';
import { ClubProgressCard } from '../dashboard/ClubProgressCard';
import type { ModeMeta } from '../dashboard/modes';
import { VERSUS_MODES, DAILY_MODES, SOLO_MODES, COMPETE_MODES } from '../dashboard/modes';

/**
 * Returning-player mode groups. Rival + daily play lead; the long tail of
 * solo/competition modes sits behind a "show all" disclosure so the dashboard
 * stays calm (the sidebar always lists everything).
 */
const PRIMARY_MODE_SECTIONS: { title: string; modes: ModeMeta[] }[] = [
  { title: 'Versus a rival', modes: VERSUS_MODES },
  { title: 'Daily puzzles', modes: DAILY_MODES },
];
const MORE_MODE_SECTIONS: { title: string; modes: ModeMeta[] }[] = [
  { title: 'Solo practice', modes: SOLO_MODES },
  { title: 'Competitions', modes: COMPETE_MODES },
];
const MORE_MODE_COUNT = MORE_MODE_SECTIONS.reduce((n, s) => n + s.modes.length, 0);

/** The core game loop, in one glanceable strip for first-time players. */
function HowItWorks() {
  const steps = [
    ['10 questions', 'Ten quickfire football mini-games.'],
    ['Fast & correct', 'Answer right, and answer quickly.'],
    ['Points → goals', 'Every answer can change the scoreline.'],
    ['Win & share', 'Take the match, then challenge a friend.'],
  ];
  return (
    <section>
      <SectionHeader eyebrow="How it works" />
      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map(([title, body], i) => (
          <li key={title} className="rounded-xl border border-white/10 bg-ink-800 p-4">
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-royal">Step {i + 1}</div>
            <div className="mt-1 font-bold text-bone">{title}</div>
            <p className="mt-1 text-sm text-bone-dim">{body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function HomePage() {
  const { createRoom, joinRoom, playDemo, playDaily, connecting, error, multiplayerAvailable } = useGame();
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
  const [showAllModes, setShowAllModes] = useState(false);
  const streak = currentStreak();
  const level = playerLevel(stats);
  const isNewPlayer = stats.matchesPlayed === 0;

  const saveClub = (identity: ClubIdentity) => {
    saveClubIdentity(identity);
    setClub(identity);
    setName(identity.name);
    setEditingClub(false);
  };

  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get('room');
    if (param) {
      setCode(normalizeRoomCode(param).slice(0, 8));
      setShowJoin(true);
    }
  }, []);

  const playName = club?.name.trim() ? club.name : name;
  const nameValid = playName.trim().length >= 1;
  const codeValid = isValidRoomCode(code);
  const greetingName = club?.name || name || 'manager';

  const warmUp = () => {
    trackEvent('match_started', { vs: 'cpu', kind: 'demo' });
    playDemo(playName);
  };
  const challengeFriend = () => {
    trackEvent('friend_challenge_created', { available: multiplayerAvailable });
    createRoom(playName);
  };
  const enterRoom = () => joinRoom(code, playName);
  const startDaily = (n: string) => {
    trackEvent('daily_started');
    playDaily(n);
  };
  const openMode = (view: View) => {
    trackEvent('mode_selected', { mode: view });
    navigate(view);
  };

  const careerBadge = career ? 'Continue' : undefined;

  const modeGrid = (modes: ModeMeta[]) => (
    <div className="grid gap-3 sm:grid-cols-2">
      {modes.map((mode) => (
        <GameModeCard
          key={mode.view}
          mode={mode}
          badge={mode.view === 'career' ? careerBadge : undefined}
          onClick={() => openMode(mode.view)}
        />
      ))}
    </div>
  );

  return (
    <div className="flex flex-1 flex-col gap-8 py-7">
      {/* Hero */}
      <header className="animate-fade-in">
        <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-royal">
          {isNewPlayer ? 'Football IQ duel' : 'Dashboard'}
        </div>
        <h1 className="mt-1.5 text-[34px] font-extrabold leading-none tracking-tight text-bone sm:text-[42px]">
          {isNewPlayer ? 'Prove your ball knowledge.' : `Welcome back, ${greetingName}`}
        </h1>
        <p className="mt-2.5 max-w-xl text-[15px] text-bone-dim">
          {isNewPlayer
            ? 'A 1v1 football IQ duel where every correct answer can score a goal. Warm up against the CPU, then challenge a friend.'
            : 'Every correct answer can change the scoreline. Defend today’s fixture, or challenge a friend to a duel.'}
        </p>

        {/* Quick actions */}
        <div className="mt-5 flex flex-wrap items-center gap-2.5">
          {!club && (
            <input
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 18))}
              placeholder="Your name"
              autoComplete="off"
              aria-label="Your name"
              className="input-field h-11 w-44"
            />
          )}
          <PrimaryButton size="lg" disabled={!nameValid || connecting} onClick={warmUp}>
            <Zap className="h-[18px] w-[18px]" strokeWidth={2.4} /> Warm up vs CPU
          </PrimaryButton>
          <SecondaryButton size="lg" disabled={!nameValid || connecting} onClick={challengeFriend}>
            <Users className="h-[18px] w-[18px]" /> Challenge a friend
          </SecondaryButton>
          <SecondaryButton size="lg" disabled={connecting} onClick={() => setShowJoin((s) => !s)}>
            <KeyRound className="h-[18px] w-[18px]" /> Enter room
          </SecondaryButton>
        </div>

        {showJoin && (
          <div className="mt-3 flex max-w-md flex-col gap-2.5 rounded-xl border border-white/10 bg-ink-800 p-3 animate-scale-in sm:flex-row">
            <input
              value={code}
              onChange={(e) => setCode(normalizeRoomCode(e.target.value).slice(0, 8))}
              placeholder="Room code"
              aria-label="Room code"
              autoComplete="off"
              className="input-field flex-1 text-center font-mono uppercase tracking-[0.25em] placeholder:tracking-normal"
            />
            <Button disabled={!nameValid || !codeValid || connecting} onClick={enterRoom}>
              Enter room
            </Button>
          </div>
        )}
        {error && (
          <p role="alert" className="mt-3 max-w-md rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
        {connecting && <p className="mt-3 text-sm text-royal animate-pulse">Connecting…</p>}
        {!nameValid && !connecting && (
          <p className="mt-2 text-xs text-bone-faint">
            Enter a name to start. {!multiplayerAvailable && 'Rooms play vs a CPU in demo mode.'}
          </p>
        )}
      </header>

      {isNewPlayer ? (
        /* ---------- First-time player: focused, low-clutter ---------- */
        <>
          <HowItWorks />
          <section>
            <SectionHeader eyebrow="Today's fixture" />
            <DailyRivalCard name={playName} connecting={connecting} onPlay={startDaily} featured />
            <p className="mt-2 text-xs text-bone-faint">One official attempt · resets at midnight</p>
          </section>
          <section>
            <SectionHeader eyebrow="Your club" />
            <ClubProgressCard club={club} level={level} stats={stats} streak={streak} onEdit={() => setEditingClub(true)} />
          </section>
        </>
      ) : (
        /* ---------- Returning player: full matchday dashboard ---------- */
        <>
          {/* Featured: Daily Rival + Your Club */}
          <section className="grid gap-4 lg:grid-cols-[1.55fr_1fr]">
            <div>
              <SectionHeader eyebrow="Today's fixture" />
              <DailyRivalCard name={playName} connecting={connecting} onPlay={startDaily} featured />
              <p className="mt-2 text-xs text-bone-faint">One official attempt · resets at midnight</p>
            </div>
            <div>
              <SectionHeader eyebrow="Your club" />
              <ClubProgressCard club={club} level={level} stats={stats} streak={streak} onEdit={() => setEditingClub(true)} />
            </div>
          </section>

          {/* Today's progress — one calm card instead of two competing panels */}
          <section>
            <SectionHeader eyebrow="Today" />
            <Card className="p-4">
              <QuestsCard embedded />
              <div className="my-4 border-t border-white/[0.06]" aria-hidden />
              <StreakRewardCard embedded />
            </Card>
          </section>

          {/* Modes: rival + daily up front; the long tail behind one disclosure */}
          {PRIMARY_MODE_SECTIONS.map(({ title, modes }) => (
            <section key={title}>
              <SectionHeader eyebrow="Play" title={title} />
              {modeGrid(modes)}
            </section>
          ))}
          {showAllModes ? (
            MORE_MODE_SECTIONS.map(({ title, modes }) => (
              <section key={title}>
                <SectionHeader eyebrow="Play" title={title} />
                {modeGrid(modes)}
              </section>
            ))
          ) : (
            <button
              type="button"
              onClick={() => setShowAllModes(true)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/10 py-3 text-sm font-semibold text-bone-dim transition-colors hover:border-white/20 hover:text-bone"
            >
              Show all game modes ({MORE_MODE_COUNT} more)
            </button>
          )}

          {/* Standings */}
          <section>
            <SectionHeader eyebrow="Standings" />
            <div className="grid gap-4 lg:grid-cols-2">
              <TrophyCabinet />
              <LeaguesCard />
            </div>
            <div className="mt-4">
              <ModeStatsCard />
            </div>
          </section>
        </>
      )}

      {/* Footer utilities */}
      <div className="flex items-center gap-4 text-sm text-bone-faint">
        <button type="button" onClick={() => setShowCosmetics(true)} className="flex items-center gap-1.5 hover:text-bone">
          <Palette className="h-4 w-4" /> Cosmetics
        </button>
        <button type="button" onClick={() => setShowSettings(true)} className="flex items-center gap-1.5 hover:text-bone">
          <Settings className="h-4 w-4" /> Settings &amp; data
        </button>
      </div>

      {editingClub && <ClubIdentityModal initial={club} onSave={saveClub} onClose={() => setEditingClub(false)} />}
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
