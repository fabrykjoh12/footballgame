import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { StadiumBackground } from './StadiumBackground';
import { SideNav } from './SideNav';
import { useGame } from '../../context/GameProvider';
import { useNav } from '../../context/NavProvider';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { setSoundEnabled, play } from '../../lib/sound';
import { IconSound, IconMute, IconClose } from '../ui/icons';
import { AccountButton } from '../auth/AccountButton';
import { FriendsButton } from '../friends/FriendsButton';
import { IncomingInviteToast } from '../friends/IncomingInviteToast';
import type { View } from '../../lib/viewRoute';

/**
 * App frame: stadium backdrop, brand header, a mode sidebar (desktop) / drawer
 * (mobile), and the centered content column. The sidebar is hidden while a
 * match is live so the game screen gets the full width.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { connectionState, room } = useGame();
  const { view, navigate } = useNav();
  const [soundOn, setSoundOn] = useLocalStorage('bk_sound', true);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Keep the sound engine's flag in sync with the persisted toggle.
  useEffect(() => {
    setSoundEnabled(soundOn);
  }, [soundOn]);

  // The mode nav is only shown between matches; a live room takes over.
  const showNav = !room;

  const go = (next: View) => {
    navigate(next);
    setDrawerOpen(false);
  };

  return (
    <div className="relative flex min-h-[100dvh] flex-col">
      <StadiumBackground />

      <header className="z-20 flex items-center justify-between border-b border-white/[0.08] px-4 py-3.5 sm:px-6">
        <div className="flex items-center gap-2.5">
          {showNav && (
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
              className="answer-press -ml-1 grid h-9 w-9 place-items-center rounded-lg text-white/65 hover:bg-white/[0.05] hover:text-white lg:hidden"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
              </svg>
            </button>
          )}
          <button
            type="button"
            onClick={() => go('home')}
            className="flex items-center gap-2.5 text-left"
            aria-label="Ball Knowledge home"
          >
            <BallMark />
            <div className="leading-none">
              <div className="text-lg font-bold tracking-tight text-white">Ball Knowledge</div>
              <div className="mt-0.5 hidden text-xs text-white/55 sm:block">
                Football knowledge duels
              </div>
            </div>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setSoundOn((s) => {
                const next = !s;
                setSoundEnabled(next);
                if (next) play('click'); // audible confirmation when enabling
                return next;
              });
            }}
            aria-pressed={soundOn}
            aria-label={soundOn ? 'Mute sound' : 'Unmute sound'}
            title={soundOn ? 'Sound on' : 'Sound off'}
            className="answer-press rounded-full border border-white/10 bg-ink-800 p-2.5 text-white/65 hover:text-white hover:bg-white/[0.04]"
          >
            {soundOn ? <IconSound /> : <IconMute />}
          </button>
          <FriendsButton />
          <AccountButton />
        </div>
      </header>

      {connectionState !== 'connected' && (
        <div
          role="status"
          className={`z-10 mx-4 mb-2 rounded-lg border px-3 py-2 text-center text-sm sm:mx-6 ${
            connectionState === 'failed'
              ? 'border-danger/30 bg-danger/10 text-danger'
              : 'border-gold/30 bg-gold/10 text-gold animate-pulse'
          }`}
        >
          {connectionState === 'failed'
            ? 'Connection lost. Check your network and rejoin.'
            : 'Reconnecting…'}
        </div>
      )}

      <div className="z-10 mx-auto flex w-full max-w-6xl flex-1">
        {/* Desktop sidebar */}
        {showNav && (
          <aside className="sticky top-0 hidden h-[calc(100dvh-65px)] w-60 shrink-0 overflow-y-auto border-r border-white/[0.08] py-7 pl-2 pr-4 lg:block">
            <SideNav view={view} onNavigate={go} />
          </aside>
        )}

        <main className="flex min-w-0 flex-1 flex-col px-4 pb-10 sm:px-8">
          <div className="mx-auto w-full max-w-3xl">{children}</div>
        </main>
      </div>

      {/* Mobile drawer */}
      {showNav &&
        drawerOpen &&
        createPortal(
          <div className="fixed inset-0 z-[90] lg:hidden">
            <div
              className="absolute inset-0 bg-black/60"
              onClick={() => setDrawerOpen(false)}
              aria-hidden
            />
            <div className="absolute inset-y-0 left-0 flex w-72 max-w-[82%] flex-col border-r border-white/10 bg-ink-800 animate-[fade-in_0.2s_ease-out]">
              <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3.5">
                <span className="text-sm font-semibold text-white">Menu</span>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Close menu"
                  className="answer-press grid h-8 w-8 place-items-center rounded-lg text-white/55 hover:bg-white/[0.05] hover:text-white"
                >
                  <IconClose className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-3 py-4">
                <SideNav view={view} onNavigate={go} />
              </div>
            </div>
          </div>,
          document.body,
        )}

      <IncomingInviteToast />
    </div>
  );
}

function BallMark() {
  return (
    <div className="grid h-9 w-9 place-items-center rounded-lg bg-royal">
      <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" aria-hidden>
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path
          d="M12 7l2.6 1.9-1 3.1h-3.2l-1-3.1zM12 12.5l3 2.2-1.1 3.3h-3.8L9 14.7z"
          fill="currentColor"
          opacity="0.85"
        />
      </svg>
    </div>
  );
}
