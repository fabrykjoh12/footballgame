import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useFriends } from '../../context/FriendsProvider';
import { formatFriendCode, isValidFriendCode } from '../../lib/friends';
import { getRecentOpponents } from '../../lib/recentOpponents';
import { getOpponentRecord, h2hSummary, h2hKey } from '../../lib/headToHead';
import { Button } from '../ui/Button';
import { IconUsers, IconClose, IconCheck, IconCopy } from '../ui/icons';

/**
 * Header control to manage your friends list. Always available (local-first):
 * save friends to invite later, and share your friend code so people can add
 * you. When signed in, adding by code links to a real account for live invites.
 */
export function FriendsButton() {
  const [open, setOpen] = useState(false);
  const { friends } = useFriends();
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Friends"
        title="Friends"
        className="answer-press flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2.5 py-2 text-white/70 hover:bg-white/10 hover:text-white"
      >
        <IconUsers className="h-5 w-5" />
        <span className="hidden text-xs font-semibold sm:inline">
          Friends{friends.length ? ` (${friends.length})` : ''}
        </span>
      </button>
      {open && <FriendsModal onClose={() => setOpen(false)} />}
    </>
  );
}

function FriendsModal({ onClose }: { onClose: () => void }) {
  const { friends, myCode, online, addByName, addByCode, remove } = useFriends();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Real opponents you've recently faced and haven't added yet.
  const friendKeys = new Set(friends.map((f) => h2hKey(f.name)));
  const recent = getRecentOpponents().filter((o) => !friendKeys.has(h2hKey(o.name)));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(myCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked */
    }
  };

  const submit = async () => {
    setError(null);
    const trimmed = name.trim();
    if (code.trim()) {
      if (!isValidFriendCode(code)) {
        setError('That friend code doesn’t look right (e.g. BK-7Q2K9M).');
        return;
      }
      setBusy(true);
      const res = await addByCode(trimmed, code);
      setBusy(false);
      if (!res.ok) {
        setError(res.error ?? 'Could not add that friend.');
        return;
      }
    } else if (trimmed) {
      addByName(trimmed);
    } else {
      setError('Enter a name or a friend code.');
      return;
    }
    setName('');
    setCode('');
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Friends"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-ink-900/90 px-5 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl border border-white/12 bg-ink-800 p-6 shadow-elev-2 animate-scale-in"
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

        <h2 className="text-center font-display text-xl font-bold">Friends</h2>
        <p className="mx-auto mt-1 max-w-xs text-center text-sm text-white/55">
          Save friends to invite them to a match in one tap — no reading out room
          codes.
        </p>

        {/* Your code */}
        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center">
          <div className="text-[11px] uppercase tracking-wider text-white/40">
            Your friend code
          </div>
          <div className="mt-1 flex items-center justify-center gap-2">
            <span className="font-mono text-lg font-bold tracking-widest text-pitch">
              {formatFriendCode(myCode)}
            </span>
            <button
              type="button"
              onClick={copyCode}
              aria-label="Copy your friend code"
              className="rounded-full p-1.5 text-white/50 hover:bg-white/10 hover:text-white"
            >
              {copied ? <IconCheck className="h-4 w-4 text-pitch" /> : <IconCopy className="h-4 w-4" />}
            </button>
          </div>
          {!online && (
            <p className="mt-1 text-[11px] text-white/35">
              Sign in to add friends by code and send live invites.
            </p>
          )}
        </div>

        {/* Add friend */}
        <div className="mt-4 flex flex-col gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 18))}
            placeholder="Friend’s name"
            className="input-field text-base"
            aria-label="Friend’s name"
          />
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 9))}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="Friend code (optional)"
            className="input-field text-center font-mono uppercase tracking-widest"
            aria-label="Friend code"
          />
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <Button fullWidth disabled={busy} onClick={submit}>
            {busy ? 'Adding…' : 'Add friend'}
          </Button>
        </div>

        {/* List */}
        <div className="mt-4 max-h-52 overflow-y-auto">
          {friends.length === 0 ? (
            <p className="py-4 text-center text-sm text-white/40">
              No friends yet. Add one above.
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {friends.map((f) => (
                <li
                  key={f.id}
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2"
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-pitch/15 text-sm font-bold text-pitch">
                    {f.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{f.name}</span>
                    {(() => {
                      const rec = getOpponentRecord(f.name);
                      if (rec && rec.played > 0) {
                        return (
                          <span className="block truncate text-[11px] text-white/45">
                            vs you: {h2hSummary(rec)}
                          </span>
                        );
                      }
                      if (f.code) {
                        return (
                          <span className="block truncate font-mono text-[11px] text-white/40">
                            {formatFriendCode(f.code)}
                            {f.uid ? ' · online' : ''}
                          </span>
                        );
                      }
                      return null;
                    })()}
                  </span>
                  <button
                    type="button"
                    onClick={() => remove(f.id)}
                    aria-label={`Remove ${f.name}`}
                    className="rounded-full p-1.5 text-white/35 hover:bg-white/10 hover:text-danger"
                  >
                    <IconClose className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent opponents you can add in one tap */}
        {recent.length > 0 && (
          <div className="mt-4">
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/40">
              Recent opponents
            </h3>
            <ul className="flex max-h-40 flex-col gap-1.5 overflow-y-auto">
              {recent.map((o) => {
                const rec = getOpponentRecord(o.name);
                return (
                  <li
                    key={o.name}
                    className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2"
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 text-sm font-bold text-white/70">
                      {o.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{o.name}</span>
                      <span className="block truncate text-[11px] text-white/45">
                        {rec && rec.played > 0
                          ? `vs you: ${h2hSummary(rec)}`
                          : `${o.games} game${o.games === 1 ? '' : 's'}`}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => addByName(o.name)}
                      className="answer-press rounded-lg border border-pitch/30 bg-pitch/10 px-2.5 py-1 text-xs font-semibold text-pitch hover:bg-pitch/20"
                    >
                      Add
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
