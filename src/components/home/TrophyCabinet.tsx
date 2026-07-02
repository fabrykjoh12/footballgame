import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { listAchievements, ACHIEVEMENTS } from '../../lib/achievements';
import {
  loadLeaderboard,
  leaderboardsAvailable,
  dailyBoardId,
  boardLabel,
  ALLTIME_BOARD_ID,
  type LeaderboardEntry,
} from '../../lib/leaderboard';
import { useAuth } from '../../context/AuthProvider';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { IconTrophy, IconClose } from '../ui/icons';

/** Home card: achievements progress + (when online) the leaderboard entry. */
export function TrophyCabinet() {
  const [view, setView] = useState<null | 'achievements' | 'leaderboard'>(null);
  const achievements = listAchievements();
  const earned = achievements.filter((a) => a.unlocked).length;
  const showLeaderboard = leaderboardsAvailable();

  return (
    <Card className="mx-auto w-full max-w-md p-4 animate-fade-in">
      <div className="mb-2 flex items-center gap-2">
        <IconTrophy className="h-5 w-5 text-gold" />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-white/80">
          Trophy Cabinet
        </h2>
        <span className="ml-auto text-xs font-bold text-gold">
          {earned}/{ACHIEVEMENTS.length}
        </span>
      </div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {achievements.slice(0, 8).map((a) => (
          <span
            key={a.id}
            title={`${a.title} — ${a.description}`}
            className={[
              'grid h-8 w-8 place-items-center rounded-full text-base',
              a.unlocked ? 'bg-gold/15 ring-1 ring-gold/30' : 'bg-white/[0.03] opacity-30 grayscale',
            ].join(' ')}
          >
            <span aria-hidden>{a.icon}</span>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" fullWidth onClick={() => setView('achievements')}>
          View achievements
        </Button>
        {showLeaderboard && (
          <Button variant="secondary" fullWidth onClick={() => setView('leaderboard')}>
            Leaderboard
          </Button>
        )}
      </div>

      {view === 'achievements' && <AchievementsModal onClose={() => setView(null)} />}
      {view === 'leaderboard' && <LeaderboardModal onClose={() => setView(null)} />}
    </Card>
  );
}

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-ink-900/90 px-5 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-white/12 bg-ink-800 p-6 shadow-elev-2 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 rounded-full p-1.5 text-white/40 hover:bg-white/10 hover:text-white"
        >
          <IconClose className="h-4 w-4" />
        </button>
        <h2 className="mb-4 text-center font-display text-xl font-bold">{title}</h2>
        {children}
      </div>
    </div>,
    document.body,
  );
}

function AchievementsModal({ onClose }: { onClose: () => void }) {
  const list = listAchievements();
  return (
    <ModalShell title="Achievements" onClose={onClose}>
      <ul className="grid max-h-[60vh] grid-cols-1 gap-2 overflow-y-auto">
        {list.map((a) => (
          <li
            key={a.id}
            className={[
              'flex items-center gap-3 rounded-xl border px-3 py-2',
              a.unlocked
                ? 'border-gold/30 bg-gold/[0.06]'
                : 'border-white/10 bg-white/[0.02]',
            ].join(' ')}
          >
            <span
              className={[
                'grid h-9 w-9 shrink-0 place-items-center rounded-full text-lg',
                a.unlocked ? 'bg-gold/15' : 'opacity-30 grayscale',
              ].join(' ')}
              aria-hidden
            >
              {a.icon}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">{a.title}</span>
              <span className="block text-xs text-white/50">{a.description}</span>
            </span>
            {a.unlocked && <span className="text-xs font-bold text-gold">✓</span>}
          </li>
        ))}
      </ul>
    </ModalShell>
  );
}

function LeaderboardModal({ onClose }: { onClose: () => void }) {
  const { configured, user } = useAuth();
  const [board, setBoard] = useState<string>(dailyBoardId());
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);

  useEffect(() => {
    let active = true;
    setEntries(null);
    void loadLeaderboard(board, 50).then((rows) => {
      if (active) setEntries(rows);
    });
    return () => {
      active = false;
    };
  }, [board]);

  return (
    <ModalShell title="Leaderboard" onClose={onClose}>
      <div className="mb-3 flex justify-center gap-2">
        <TabButton active={board.startsWith('daily-')} onClick={() => setBoard(dailyBoardId())}>
          Today
        </TabButton>
        <TabButton active={board === ALLTIME_BOARD_ID} onClick={() => setBoard(ALLTIME_BOARD_ID)}>
          All-time
        </TabButton>
      </div>
      <p className="mb-3 text-center text-[11px] text-white/40">{boardLabel(board)}</p>

      {!configured ? (
        <p className="py-6 text-center text-sm text-white/50">
          Online leaderboards aren’t enabled in this build.
        </p>
      ) : entries === null ? (
        <div className="flex flex-col gap-1.5 py-1" aria-busy="true" aria-label="Loading leaderboard">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border border-white/10 px-3 py-2">
              <span className="skeleton h-4 w-6" />
              <span className="skeleton h-4 flex-1" />
              <span className="skeleton h-4 w-12" />
            </div>
          ))}
        </div>
      ) : entries.length === 0 ? (
        <p className="py-6 text-center text-sm text-white/50">
          No scores yet. {board.startsWith('daily-') ? 'Play today’s Daily Challenge' : 'Play a match'} to
          get on the board!
        </p>
      ) : (
        <ol className="flex max-h-[55vh] flex-col gap-1.5 overflow-y-auto">
          {entries.map((e, i) => (
            <li
              key={e.uid}
              className={[
                'flex items-center gap-3 rounded-xl border px-3 py-2',
                user && e.uid === user.id
                  ? 'border-pitch/40 bg-pitch/[0.08]'
                  : 'border-white/10 bg-white/[0.02]',
              ].join(' ')}
            >
              <span className="w-6 text-center font-mono text-sm font-bold text-white/60">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">{e.name}</span>
              <span className="font-mono text-sm font-bold text-pitch">
                {e.score.toLocaleString()}
              </span>
            </li>
          ))}
        </ol>
      )}

      {configured && !user && (
        <div className="mt-3 text-center">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event('bk:open-signin'))}
            className="answer-press rounded-lg border border-pitch/30 bg-pitch/10 px-3 py-1.5 text-xs font-semibold text-pitch hover:bg-pitch/20"
          >
            Sign in to appear on the board
          </button>
        </div>
      )}
    </ModalShell>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        'answer-press rounded-full border px-4 py-1.5 text-xs font-semibold',
        active
          ? 'border-pitch/60 bg-pitch/15 text-pitch'
          : 'border-white/10 bg-white/[0.03] text-white/55 hover:bg-white/[0.06]',
      ].join(' ')}
    >
      {children}
    </button>
  );
}
