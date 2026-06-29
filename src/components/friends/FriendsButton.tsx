import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useFriends, type UserSearchResult } from '../../context/FriendsProvider';
import { useGame } from '../../context/GameProvider';
import { formatFriendCode, isValidFriendCode, type Friend } from '../../lib/friends';
import { getRecentOpponents } from '../../lib/recentOpponents';
import { getOpponentRecord, h2hSummary, h2hKey } from '../../lib/headToHead';
import { Button } from '../ui/Button';
import { IconUsers, IconClose, IconCheck, IconCopy, IconShare } from '../ui/icons';

/**
 * Header control to manage your friends list. When signed in, search friends
 * by username directly. Falls back to friend code + name-only for offline/
 * anonymous users.
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
  const { friends, myCode, online, addByName, addByCode, searchUsers, addByUsername, remove, invite } =
    useFriends();
  const { room, serviceMode } = useGame();
  const [tab, setTab] = useState<'search' | 'code'>('search');

  // You can invite straight to your current match when in a live multiplayer room.
  const canInvite = serviceMode === 'remote' && !!room;
  const [invited, setInvited] = useState<Record<string, 'pushed' | 'shared'>>({});

  const onInvite = async (friend: Friend) => {
    if (!room) return;
    const payload = await invite(friend, room.roomCode);
    if (payload.pushed) {
      setInvited((d) => ({ ...d, [friend.id]: 'pushed' }));
      return;
    }
    // No live channel — share or copy the pre-filled message.
    const nav = navigator as Navigator & {
      share?: (data: { title?: string; text?: string; url?: string }) => Promise<void>;
    };
    try {
      if (typeof nav.share === 'function') {
        await nav.share({ title: 'Ball Knowledge', text: payload.text, url: payload.link });
      } else {
        await nav.clipboard.writeText(payload.text);
      }
      setInvited((d) => ({ ...d, [friend.id]: 'shared' }));
    } catch {
      /* user cancelled the share sheet — leave the button ready to retry */
    }
  };

  // Username search state
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Friend-code / name-only add state
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const friendKeys = new Set(friends.map((f) => h2hKey(f.name)));
  const recent = getRecentOpponents().filter((o) => !friendKeys.has(h2hKey(o.name)));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Debounced username search
  useEffect(() => {
    clearTimeout(searchTimer.current);
    const q = query.trim().toLowerCase();
    if (!online || q.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      const results = await searchUsers(q);
      setSearchResults(results);
      setSearching(false);
    }, 400);
    return () => clearTimeout(searchTimer.current);
  }, [query, online, searchUsers]);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(myCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked */
    }
  };

  const handleAddByUsername = async (result: UserSearchResult) => {
    const res = await addByUsername(result);
    if (res.ok) setAdded((prev) => new Set(prev).add(result.uid));
  };

  const submitCode = async () => {
    setError(null);
    const trimmed = name.trim();
    if (code.trim()) {
      if (!isValidFriendCode(code)) {
        setError("That friend code doesn't look right (e.g. BK-7Q2K9M).");
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

  // Friends already in your list (by uid) for disabling search-result add buttons
  const friendUids = new Set(friends.map((f) => f.uid).filter(Boolean));

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
          {canInvite
            ? 'Tap Invite next to a friend to bring them into your match.'
            : 'Add friends to invite them to a match in one tap.'}
        </p>

        {/* Your code */}
        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center">
          <div className="text-[11px] uppercase tracking-wider text-white/40">Your friend code</div>
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
              {copied ? (
                <IconCheck className="h-4 w-4 text-pitch" />
              ) : (
                <IconCopy className="h-4 w-4" />
              )}
            </button>
          </div>
          {!online && (
            <p className="mt-1 text-[11px] text-white/35">
              Sign in to search by username and send live invites.
            </p>
          )}
        </div>

        {/* Add friend — tabs when online */}
        <div className="mt-4">
          {online ? (
            <>
              <div className="mb-3 flex rounded-xl border border-white/10 bg-white/[0.03] p-1">
                <button
                  type="button"
                  onClick={() => setTab('search')}
                  className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-colors ${
                    tab === 'search'
                      ? 'bg-pitch/20 text-pitch'
                      : 'text-white/50 hover:text-white/80'
                  }`}
                >
                  Search username
                </button>
                <button
                  type="button"
                  onClick={() => setTab('code')}
                  className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-colors ${
                    tab === 'code'
                      ? 'bg-pitch/20 text-pitch'
                      : 'text-white/50 hover:text-white/80'
                  }`}
                >
                  Friend code
                </button>
              </div>

              {tab === 'search' ? (
                <div className="flex flex-col gap-2">
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="Search by username…"
                    className="input-field text-base"
                    aria-label="Search by username"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                  />
                  {searching && (
                    <p className="text-center text-xs text-white/40">Searching…</p>
                  )}
                  {!searching && query.length >= 2 && searchResults.length === 0 && (
                    <p className="text-center text-xs text-white/40">No players found.</p>
                  )}
                  {searchResults.length > 0 && (
                    <ul className="flex max-h-48 flex-col gap-1.5 overflow-y-auto">
                      {searchResults.map((r) => {
                        const alreadyAdded = added.has(r.uid) || friendUids.has(r.uid);
                        return (
                          <li
                            key={r.uid}
                            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2"
                          >
                            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-pitch/15 text-sm font-bold text-pitch">
                              {r.username[0].toUpperCase()}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-mono text-sm font-semibold">
                                @{r.username}
                              </span>
                              {r.name !== r.username && (
                                <span className="block truncate text-[11px] text-white/45">
                                  {r.name}
                                </span>
                              )}
                            </span>
                            {alreadyAdded ? (
                              <span className="flex items-center gap-1 text-xs text-pitch">
                                <IconCheck className="h-3.5 w-3.5" /> Added
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => void handleAddByUsername(r)}
                                className="answer-press rounded-lg border border-pitch/30 bg-pitch/10 px-2.5 py-1 text-xs font-semibold text-pitch hover:bg-pitch/20"
                              >
                                Add
                              </button>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value.slice(0, 18))}
                    placeholder="Friend's name"
                    className="input-field text-base"
                    aria-label="Friend's name"
                  />
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 9))}
                    onKeyDown={(e) => e.key === 'Enter' && void submitCode()}
                    placeholder="Friend code (e.g. BK-7Q2K9M)"
                    className="input-field text-center font-mono uppercase tracking-widest"
                    aria-label="Friend code"
                  />
                  {error && (
                    <p role="alert" className="text-sm text-danger">
                      {error}
                    </p>
                  )}
                  <Button fullWidth disabled={busy} onClick={() => void submitCode()}>
                    {busy ? 'Adding…' : 'Add friend'}
                  </Button>
                </div>
              )}
            </>
          ) : (
            // Offline: name + code form only
            <div className="flex flex-col gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 18))}
                placeholder="Friend's name"
                className="input-field text-base"
                aria-label="Friend's name"
              />
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 9))}
                onKeyDown={(e) => e.key === 'Enter' && void submitCode()}
                placeholder="Friend code (optional)"
                className="input-field text-center font-mono uppercase tracking-widest"
                aria-label="Friend code"
              />
              {error && (
                <p role="alert" className="text-sm text-danger">
                  {error}
                </p>
              )}
              <Button fullWidth disabled={busy} onClick={() => void submitCode()}>
                {busy ? 'Adding…' : 'Add friend'}
              </Button>
            </div>
          )}
        </div>

        {/* Friends list */}
        <div className="mt-4 max-h-52 overflow-y-auto">
          {friends.length === 0 ? (
            <p className="py-4 text-center text-sm text-white/40">
              No friends yet. {online ? 'Search by username above.' : 'Add one above.'}
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
                  {canInvite &&
                    (invited[f.id] ? (
                      <span className="flex items-center gap-1 px-1 text-xs font-semibold text-pitch">
                        <IconCheck className="h-3.5 w-3.5" />
                        {invited[f.id] === 'pushed' ? 'Invited' : 'Shared'}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void onInvite(f)}
                        aria-label={`Invite ${f.name} to your match`}
                        className="answer-press flex items-center gap-1 rounded-lg border border-pitch/30 bg-pitch/10 px-2.5 py-1 text-xs font-semibold text-pitch hover:bg-pitch/20"
                      >
                        <IconShare className="h-3.5 w-3.5" /> Invite
                      </button>
                    ))}
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

        {/* Recent opponents */}
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
