import { useState } from 'react';
import { useFriends } from '../../context/FriendsProvider';
import type { Friend } from '../../lib/friends';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { IconShare, IconCheck } from '../ui/icons';

/**
 * Lobby section: invite a saved friend to this room in one tap. Sends a live
 * push invite when the friend has an online account; otherwise it opens the
 * share sheet (or copies) a pre-filled message so you never dictate a code.
 */
export function InviteFriends({ roomCode }: { roomCode: string }) {
  const { friends, invite } = useFriends();
  const [done, setDone] = useState<Record<string, 'pushed' | 'shared'>>({});

  if (friends.length === 0) return null;

  const onInvite = async (friend: Friend) => {
    const payload = await invite(friend, roomCode);
    if (payload.pushed) {
      setDone((d) => ({ ...d, [friend.id]: 'pushed' }));
      return;
    }
    // No live channel — share or copy the pre-filled message.
    const shareData = { title: 'Ball Knowledge', text: payload.text, url: payload.link };
    try {
      if (typeof navigator !== 'undefined' && 'share' in navigator) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(payload.text);
      }
      setDone((d) => ({ ...d, [friend.id]: 'shared' }));
    } catch {
      /* user cancelled the share sheet — leave the button ready to retry */
    }
  };

  return (
    <Card className="p-4">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-white/70">
        Invite a friend
      </h2>
      <ul className="flex flex-col gap-1.5">
        {friends.map((f) => {
          const state = done[f.id];
          return (
            <li
              key={f.id}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-pitch/15 text-sm font-bold text-pitch">
                {f.name.charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">{f.name}</span>
              <Button size="sm" variant={state ? 'ghost' : 'secondary'} onClick={() => onInvite(f)}>
                {state ? (
                  <>
                    <IconCheck className="h-4 w-4 text-pitch" />
                    {state === 'pushed' ? 'Invited' : 'Shared'}
                  </>
                ) : (
                  <>
                    <IconShare className="h-4 w-4" /> Invite
                  </>
                )}
              </Button>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-[11px] leading-relaxed text-white/35">
        Online friends get a live pop-up to join. Everyone else gets a ready-to-send
        link — no need to read out the code.
      </p>
    </Card>
  );
}
