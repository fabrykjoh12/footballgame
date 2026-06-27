import { useEffect, type ReactNode } from 'react';
import { StadiumBackground } from './StadiumBackground';
import { useGame } from '../../context/GameProvider';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { setSoundEnabled, play } from '../../lib/sound';
import { IconSound, IconMute } from '../ui/icons';
import { AccountButton } from '../auth/AccountButton';
import { FriendsButton } from '../friends/FriendsButton';
import { IncomingInviteToast } from '../friends/IncomingInviteToast';

/** App frame: stadium backdrop, brand header, and a centered content column. */
export function AppShell({ children }: { children: ReactNode }) {
  const { connectionState } = useGame();
  const [soundOn, setSoundOn] = useLocalStorage('bk_sound', true);

  // Keep the sound engine's flag in sync with the persisted toggle.
  useEffect(() => {
    setSoundEnabled(soundOn);
  }, [soundOn]);

  return (
    <div className="relative flex min-h-[100dvh] flex-col">
      <StadiumBackground />

      <header className="z-10 flex items-center justify-between px-4 py-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <BallMark />
          <div className="leading-none">
            <div className="font-display text-lg font-bold tracking-tight">
              Ball <span className="text-pitch">Knowledge</span>
            </div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/40">
              Football IQ Duel
            </div>
          </div>
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
            className="answer-press rounded-full border border-white/10 bg-white/5 p-2.5 text-white/70 hover:text-white hover:bg-white/10"
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

      <main className="z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pb-10 sm:px-6">
        {children}
      </main>

      <IncomingInviteToast />
    </div>
  );
}

function BallMark() {
  return (
    <div className="grid h-9 w-9 place-items-center rounded-xl bg-pitch/15 ring-1 ring-pitch/30 shadow-glow">
      <svg viewBox="0 0 24 24" className="h-5 w-5 text-pitch" aria-hidden>
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
