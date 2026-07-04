import { useEffect, useState } from 'react';
import { Menu, Volume2, VolumeX, Flame } from 'lucide-react';
import { getProfileStats } from '../../lib/profileStats';
import { playerLevel } from '../../lib/playerLevel';
import { currentStreak } from '../../lib/streakRewards';
import { getClubIdentity } from '../../lib/clubIdentity';
import { ClubBadge } from '../club/ClubBadge';
import { FriendsButton } from '../friends/FriendsButton';
import { AccountButton } from '../auth/AccountButton';

/** The app top bar: brand, manager level/XP/streak cluster, friends, account, sound. */
export function TopBar({
  onHome,
  soundOn,
  onToggleSound,
  onOpenMenu,
  showMenu,
}: {
  onHome: () => void;
  soundOn: boolean;
  onToggleSound: () => void;
  onOpenMenu: () => void;
  showMenu: boolean;
}) {
  const [snapshot, setSnapshot] = useState(() => readSnapshot());
  useEffect(() => {
    const refresh = () => setSnapshot(readSnapshot());
    window.addEventListener('bk:progress-changed', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('bk:progress-changed', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);
  const { level, streak, club } = snapshot;

  return (
    <header className="sticky top-0 z-20 border-b border-white/[0.07] bg-ink-900/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          {showMenu && (
            <button
              type="button"
              onClick={onOpenMenu}
              aria-label="Open menu"
              className="grid h-9 w-9 place-items-center rounded-lg text-bone-dim transition-colors hover:bg-white/[0.06] hover:text-bone lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}
          <button type="button" onClick={onHome} className="flex items-center gap-2.5 text-left" aria-label="Home">
            <BallMark />
            <span className="text-[17px] font-bold tracking-tight text-bone">Ball Knowledge</span>
          </button>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Manager level / XP / streak cluster */}
          <div className="hidden items-center gap-3 rounded-full border border-white/[0.07] bg-ink-800 py-1 pl-1 pr-3 sm:flex">
            {club ? (
              <ClubBadge identity={club} size={30} />
            ) : (
              <span className="grid h-[30px] w-[30px] place-items-center rounded-full bg-royal/15 text-xs font-bold text-royal">
                {level.level}
              </span>
            )}
            <div className="leading-tight">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-bone">Lv {level.level}</span>
                <span className="text-[11px] text-bone-faint">{level.title}</span>
              </div>
              <div className="mt-1 h-1 w-24 overflow-hidden rounded-full bg-ink-600">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-royal-dark to-royal transition-[width] duration-700"
                  style={{ width: `${Math.max(4, Math.round(level.progress * 100))}%` }}
                />
              </div>
            </div>
            <span className="flex items-center gap-1 border-l border-white/[0.07] pl-2.5 text-xs font-bold text-gold">
              <Flame className="h-3.5 w-3.5" strokeWidth={2.4} />
              <span className="nums">{streak}</span>
            </span>
          </div>

          <FriendsButton />
          <AccountButton />
          <button
            type="button"
            onClick={onToggleSound}
            aria-pressed={soundOn}
            aria-label={soundOn ? 'Mute sound' : 'Unmute sound'}
            title={soundOn ? 'Sound on' : 'Sound off'}
            className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-ink-800 text-bone-dim transition-colors hover:bg-white/[0.06] hover:text-bone"
          >
            {soundOn ? <Volume2 className="h-[18px] w-[18px]" /> : <VolumeX className="h-[18px] w-[18px]" />}
          </button>
        </div>
      </div>
    </header>
  );
}

function readSnapshot() {
  const stats = getProfileStats();
  return { level: playerLevel(stats), streak: currentStreak(), club: getClubIdentity() };
}

function BallMark() {
  return (
    <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-royal to-royal-dark shadow-[0_4px_14px_-4px_rgba(46,213,115,0.6)]">
      <svg viewBox="0 0 24 24" className="h-5 w-5 text-ink-900" aria-hidden>
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M12 7l2.6 1.9-1 3.1h-3.2l-1-3.1zM12 12.5l3 2.2-1.1 3.3h-3.8L9 14.7z"
          fill="currentColor"
        />
      </svg>
    </div>
  );
}
