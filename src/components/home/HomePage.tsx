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
import { PrimaryButton, SecondaryButton, Button } from '../ui/Button';
import { DailyRivalCard } from './DailyRivalCard';
import { QuestsCard } from './QuestsCard';
import { StreakRewardCard } from './StreakRewardCard';
import { TrophyCabinet } from './TrophyCabinet';
import { LeaguesCard } from '../leagues/LeaguesCard';
import { ClubIdentityModal } from '../club/ClubIdentityModal';
import { SettingsModal } from '../settings/SettingsModal';
import { CosmeticsModal } from '../cosmetics/CosmeticsModal';
import { OnboardingOverlay } from '../onboarding/OnboardingOverlay';
import { hasOnboarded } from '../../lib/onboarding';
import { SectionHeader } from '../dashboard/SectionHeader';
import { GameModeCard } from '../dashboard/GameModeCard';
import { ClubProgressCard } from '../dashboard/ClubProgressCard';
import { VERSUS_MODES, DAILY_MODES, SOLO_MODES, COMPETE_MODES } from '../dashboard/modes';

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
  const streak = currentStreak();
  const level = playerLevel(stats);

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

  const careerBadge = career ? 'Continue' : undefined;
  const modeCards = [...VERSUS_MODES, ...DAILY_MODES, ...SOLO_MODES, ...COMPETE_MODES];

  return (
    <div className="flex flex-1 flex-col gap-8 py-7">
      {/* Welcome */}
      <header className="animate-fade-in">
        <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-royal">Dashboard</div>
        <h1 className="mt-1.5 text-[34px] font-extrabold leading-none tracking-tight text-bone sm:text-[42px]">
          Welcome back, {greetingName}
        </h1>
        <p className="mt-2.5 max-w-xl text-[15px] text-bone-dim">
          Your football knowledge, scored like a match. Jump into a duel, defend your daily streak, or climb the modes.
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
          <PrimaryButton size="lg" disabled={!nameValid || connecting} onClick={() => playDemo(playName)}>
            <Zap className="h-[18px] w-[18px]" strokeWidth={2.4} /> Play vs CPU
          </PrimaryButton>
          <SecondaryButton size="lg" disabled={!nameValid || connecting} onClick={() => createRoom(playName)}>
            <Users className="h-[18px] w-[18px]" /> Create room
          </SecondaryButton>
          <SecondaryButton size="lg" disabled={connecting} onClick={() => setShowJoin((s) => !s)}>
            <KeyRound className="h-[18px] w-[18px]" /> Join
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
            <Button disabled={!nameValid || !codeValid || connecting} onClick={() => joinRoom(code, playName)}>
              Join room
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

      {/* Featured: Daily Rival + Your Club */}
      <section className="grid gap-4 lg:grid-cols-[1.55fr_1fr]">
        <div>
          <SectionHeader eyebrow="Today's fixture" />
          <DailyRivalCard name={playName} connecting={connecting} onPlay={playDaily} featured />
          <p className="mt-2 text-xs text-bone-faint">One official attempt · resets at midnight</p>
        </div>
        <div>
          <SectionHeader eyebrow="Your club" />
          <ClubProgressCard club={club} level={level} stats={stats} streak={streak} onEdit={() => setEditingClub(true)} />
        </div>
      </section>

      {/* Play modes */}
      <section>
        <SectionHeader eyebrow="Play" title="Game modes" />
        <div className="grid gap-3 sm:grid-cols-2">
          {modeCards.map((mode) => (
            <GameModeCard
              key={mode.view}
              mode={mode}
              badge={mode.view === 'career' ? careerBadge : undefined}
              onClick={() => navigate(mode.view)}
            />
          ))}
        </div>
      </section>

      {/* Today's progress */}
      <section className="grid gap-4 lg:grid-cols-2">
        <QuestsCard />
        <StreakRewardCard />
      </section>

      {/* Leaderboard & leagues */}
      <section className="grid gap-4 lg:grid-cols-2">
        <TrophyCabinet />
        <LeaguesCard />
      </section>

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
