import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { StadiumBackground } from './StadiumBackground';
import { SideNav } from './SideNav';
import { TopBar } from './TopBar';
import { useGame } from '../../context/GameProvider';
import { useNav } from '../../context/NavProvider';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { setSoundEnabled, play } from '../../lib/sound';
import { IncomingInviteToast } from '../friends/IncomingInviteToast';
import type { View } from '../../lib/viewRoute';

/**
 * App frame: stadium backdrop, top bar, a compact mode sidebar (desktop) /
 * drawer (mobile), and the centered content column. The nav is hidden while a
 * match is live so the game gets the full width.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { connectionState, room, leaveRoom } = useGame();
  const { view, navigate } = useNav();
  const [soundOn, setSoundOn] = useLocalStorage('bk_sound', true);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    setSoundEnabled(soundOn);
  }, [soundOn]);

  const showNav = !room;

  const go = (next: View) => {
    navigate(next);
    setDrawerOpen(false);
  };

  const toggleSound = () =>
    setSoundOn((s) => {
      const next = !s;
      setSoundEnabled(next);
      if (next) play('click');
      return next;
    });

  return (
    <div className="relative flex min-h-[100dvh] flex-col">
      <StadiumBackground />

      <TopBar
        onHome={() => {
          // A live match renders off room status, not the view — leave it too
          // so the brand always returns to the main page.
          if (room) void leaveRoom();
          go('home');
        }}
        soundOn={soundOn}
        onToggleSound={toggleSound}
        onOpenMenu={() => setDrawerOpen(true)}
        showMenu={showNav}
      />

      {connectionState !== 'connected' && (
        <div
          role="status"
          className={`z-10 mx-auto mt-2 w-full max-w-[1280px] rounded-lg border px-3 py-2 text-center text-sm ${
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

      <div className="z-10 mx-auto flex w-full max-w-[1280px] flex-1 px-4 sm:px-6">
        {showNav && (
          <aside className="no-scrollbar sticky top-16 hidden h-[calc(100dvh-64px)] w-[220px] shrink-0 overflow-y-auto py-6 pr-5 lg:block">
            <SideNav view={view} onNavigate={go} />
          </aside>
        )}

        <main className={`flex min-w-0 flex-1 flex-col pb-14 ${showNav ? 'lg:border-l lg:border-white/[0.06] lg:pl-6' : ''}`}>
          {children}
        </main>
      </div>

      {/* Mobile drawer */}
      {showNav &&
        drawerOpen &&
        createPortal(
          <div className="fixed inset-0 z-[90] lg:hidden">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} aria-hidden />
            <div className="absolute inset-y-0 left-0 flex w-72 max-w-[82%] flex-col border-r border-white/[0.08] bg-ink-900 animate-[fade-in_0.2s_ease-out]">
              <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-4">
                <span className="text-sm font-bold text-bone">Menu</span>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Close menu"
                  className="grid h-8 w-8 place-items-center rounded-lg text-bone-faint hover:bg-white/[0.06] hover:text-bone"
                >
                  <X className="h-4 w-4" />
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
