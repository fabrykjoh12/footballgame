/**
 * Friends context — local-first friends list plus the optional online layer
 * (add by friend code, push/receive match invites) that activates only when
 * Firebase sign-in is configured AND the player is signed in.
 *
 * Everything degrades gracefully: with no backend, you can still save friends
 * and fire off a pre-filled invite link through the share sheet. The online
 * calls are dynamically imported so the Firebase SDK stays code-split.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from './AuthProvider';
import {
  addFriend as addFriendLocal,
  buildInviteLink,
  buildInviteText,
  getFriends,
  getMyIdentity,
  normalizeFriendCode,
  removeFriend as removeFriendLocal,
  renameFriend as renameFriendLocal,
  type Friend,
} from '../lib/friends';

type Backend = typeof import('../services/firebaseBackend');

export interface IncomingInvite {
  id: string;
  fromName: string;
  roomCode: string;
}

export interface InvitePayload {
  /** A shareable deep link that pre-fills the room code. */
  link: string;
  /** A ready-to-send message addressed to the friend. */
  text: string;
  /** True if a live push invite was also delivered to their app. */
  pushed: boolean;
}

export interface UserSearchResult {
  uid: string;
  name: string;
  username: string;
  friendCode: string;
}

interface FriendsContextValue {
  /** Whether the online layer (codes, push invites) is active. */
  online: boolean;
  friends: Friend[];
  myCode: string;
  /** Add a friend you'll just share a link with (no account needed). */
  addByName: (name: string) => void;
  /** Add a friend by their code; resolves to an account when online. */
  addByCode: (name: string, code: string) => Promise<{ ok: boolean; error?: string }>;
  /** Search for users by username prefix (online only). */
  searchUsers: (searchTerm: string) => Promise<UserSearchResult[]>;
  /** Add a friend directly from a search result (online only). */
  addByUsername: (result: UserSearchResult) => Promise<{ ok: boolean; error?: string }>;
  remove: (id: string) => void;
  rename: (id: string, name: string) => void;
  /** Build an invite for a friend (and push it live when possible). */
  invite: (friend: Friend, roomCode: string) => Promise<InvitePayload>;
  /** Live incoming invites (online only). */
  incoming: IncomingInvite[];
  dismissInvite: (id: string) => void;
}

const FriendsContext = createContext<FriendsContextValue | null>(null);

function displayName(user: { email: string | null; username: string | null } | null): string {
  if (user?.username) return user.username;
  try {
    const stored = localStorage.getItem('bk_name');
    if (stored && stored.trim()) return stored.trim();
  } catch {
    /* ignore */
  }
  return user?.email?.split('@')[0] ?? 'Player';
}

export function FriendsProvider({ children }: { children: ReactNode }) {
  const { configured, user } = useAuth();
  const online = configured && !!user;

  const [friends, setFriends] = useState<Friend[]>(() => getFriends());
  const [incoming, setIncoming] = useState<IncomingInvite[]>([]);
  const myCode = useMemo(() => getMyIdentity().friendCode, []);
  const backendRef = useRef<Backend | null>(null);

  const loadBackend = useCallback(async (): Promise<Backend | null> => {
    if (!online) return null;
    if (backendRef.current) return backendRef.current;
    try {
      backendRef.current = await import('../services/firebaseBackend');
      return backendRef.current;
    } catch {
      return null;
    }
  }, [online]);

  // On sign-in: publish our public profile, pull online friends, watch invites.
  useEffect(() => {
    if (!online || !user) return;
    let unsub = () => {};
    let active = true;
    (async () => {
      const backend = await loadBackend();
      if (!backend || !active) return;
      try {
        await backend.publishProfile(user.id, displayName(user), myCode);
      } catch {
        /* ignore */
      }
      try {
        const remote = await backend.listFriendsOnline(user.id);
        if (active && remote.length) {
          for (const f of remote) addFriendLocal({ name: f.name, code: f.friendCode, uid: f.uid });
          setFriends(getFriends());
        }
      } catch {
        /* ignore */
      }
      unsub = backend.watchInvites(user.id, (invites) => {
        if (!active) return;
        setIncoming(invites.map((i) => ({ id: i.id, fromName: i.fromName, roomCode: i.roomCode })));
      });
    })();
    return () => {
      active = false;
      unsub();
    };
  }, [online, user, myCode, loadBackend]);

  const addByName = useCallback((name: string) => {
    addFriendLocal({ name });
    setFriends(getFriends());
  }, []);

  const searchUsers = useCallback(
    async (searchTerm: string): Promise<UserSearchResult[]> => {
      if (!online || searchTerm.length < 2) return [];
      const backend = await loadBackend();
      if (!backend) return [];
      try {
        const results = await backend.searchUsersByUsername(searchTerm);
        return results
          .filter((p) => p.username)
          .map((p) => ({
            uid: p.uid,
            name: p.name,
            username: p.username!,
            friendCode: p.friendCode,
          }));
      } catch {
        return [];
      }
    },
    [online, loadBackend],
  );

  const addByUsername = useCallback(
    async (result: UserSearchResult): Promise<{ ok: boolean; error?: string }> => {
      if (online && user) {
        const backend = await loadBackend();
        if (backend) {
          try {
            await backend.addFriendOnline(user.id, {
              uid: result.uid,
              name: result.name,
              username: result.username,
              friendCode: result.friendCode,
            });
          } catch {
            /* save locally anyway */
          }
        }
      }
      addFriendLocal({ name: result.username, code: result.friendCode, uid: result.uid });
      setFriends(getFriends());
      return { ok: true };
    },
    [online, user, loadBackend],
  );

  const addByCode = useCallback(
    async (name: string, code: string): Promise<{ ok: boolean; error?: string }> => {
      const normalized = normalizeFriendCode(code);
      // Always keep a local entry so the friend is usable offline.
      if (online && user) {
        const backend = await loadBackend();
        if (backend) {
          try {
            const profile = await backend.resolveFriendCode(normalized);
            if (!profile) return { ok: false, error: 'No player found with that code.' };
            await backend.addFriendOnline(user.id, profile);
            addFriendLocal({ name: name || profile.name, code: profile.friendCode, uid: profile.uid });
            setFriends(getFriends());
            return { ok: true };
          } catch {
            return { ok: false, error: 'Could not reach the server. Saved locally instead.' };
          }
        }
      }
      addFriendLocal({ name: name || 'Friend', code: normalized });
      setFriends(getFriends());
      return { ok: true };
    },
    [online, user, loadBackend],
  );

  const remove = useCallback(
    (id: string) => {
      const friend = friends.find((f) => f.id === id);
      removeFriendLocal(id);
      setFriends(getFriends());
      if (online && user && friend?.uid) {
        void loadBackend().then((b) => b?.removeFriendOnline(user.id, friend.uid!).catch(() => {}));
      }
    },
    [friends, online, user, loadBackend],
  );

  const rename = useCallback((id: string, name: string) => {
    renameFriendLocal(id, name);
    setFriends(getFriends());
  }, []);

  const invite = useCallback(
    async (friend: Friend, roomCode: string): Promise<InvitePayload> => {
      const origin =
        typeof window !== 'undefined'
          ? window.location.origin + window.location.pathname
          : '';
      const link = buildInviteLink(roomCode, origin);
      const text = buildInviteText(friend.name, roomCode, link);
      let pushed = false;
      if (online && user && friend.uid) {
        const backend = await loadBackend();
        if (backend) {
          try {
            await backend.sendInvite(friend.uid, {
              fromUid: user.id,
              fromName: displayName(user),
              roomCode,
            });
            pushed = true;
          } catch {
            /* fall back to the share link */
          }
        }
      }
      return { link, text, pushed };
    },
    [online, user, loadBackend],
  );

  const dismissInvite = useCallback(
    (id: string) => {
      setIncoming((prev) => prev.filter((i) => i.id !== id));
      if (online && user) {
        void loadBackend().then((b) => b?.clearInvite(user.id, id).catch(() => {}));
      }
    },
    [online, user, loadBackend],
  );

  const value = useMemo<FriendsContextValue>(
    () => ({
      online,
      friends,
      myCode,
      addByName,
      addByCode,
      searchUsers,
      addByUsername,
      remove,
      rename,
      invite,
      incoming,
      dismissInvite,
    }),
    [online, friends, myCode, addByName, addByCode, searchUsers, addByUsername, remove, rename, invite, incoming, dismissInvite],
  );

  return <FriendsContext.Provider value={value}>{children}</FriendsContext.Provider>;
}

export function useFriends(): FriendsContextValue {
  const ctx = useContext(FriendsContext);
  if (!ctx) throw new Error('useFriends must be used within a FriendsProvider');
  return ctx;
}
