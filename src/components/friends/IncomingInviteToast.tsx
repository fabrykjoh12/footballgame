import { createPortal } from 'react-dom';
import { useFriends } from '../../context/FriendsProvider';
import { useGame } from '../../context/GameProvider';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { Button } from '../ui/Button';
import { IconClose, IconUsers } from '../ui/icons';

/**
 * Live "X invited you to a match" pop-up (online layer). Tapping Join enters the
 * friend's room straight away — no code to type. Only the most recent invite is
 * shown to avoid stacking. Renders via a body portal so it floats above all
 * screens (house rule for full-screen overlays).
 */
export function IncomingInviteToast() {
  const { incoming, dismissInvite } = useFriends();
  const { joinRoom, room } = useGame();
  const [name] = useLocalStorage('bk_name', '');

  // Don't interrupt an in-progress match with a join prompt.
  const invite = incoming[0];
  if (!invite || (room && room.status !== 'lobby')) return null;

  const accept = async () => {
    dismissInvite(invite.id);
    await joinRoom(invite.roomCode, name.trim() || 'Player');
  };

  return createPortal(
    <div className="fixed inset-x-0 bottom-4 z-[110] flex justify-center px-4 animate-rise-in">
      <div className="flex w-full max-w-sm items-center gap-3 rounded-2xl border border-pitch/30 bg-ink-800 p-3 shadow-elev-2">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-pitch/15 text-pitch">
          <IconUsers className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">
            {invite.fromName} invited you
          </div>
          <div className="truncate text-xs text-white/50">
            Room {invite.roomCode} · tap join to play
          </div>
        </div>
        <Button size="sm" onClick={accept}>
          Join
        </Button>
        <button
          type="button"
          onClick={() => dismissInvite(invite.id)}
          aria-label="Dismiss invite"
          className="rounded-full p-1.5 text-white/40 hover:bg-white/10 hover:text-white"
        >
          <IconClose className="h-4 w-4" />
        </button>
      </div>
    </div>,
    document.body,
  );
}
