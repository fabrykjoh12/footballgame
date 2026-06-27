/**
 * Friends — a local-first friends list plus the helpers for inviting a friend
 * to a match without dictating a room code aloud.
 *
 * Local layer (always available, no backend): save friends by name + optional
 * friend code, and build a pre-filled invite link/message you can fire off
 * through the share sheet. The online layer (Firestore) lives in
 * `services/firebaseBackend.ts` and lights up only when signed in — see
 * `context/FriendsProvider.tsx`.
 *
 * The string helpers (friend-code format, invite text) are pure and unit-tested.
 */

import { uid } from './id';

const FRIENDS_KEY = 'bk_friends_v1';
const ME_KEY = 'bk_me_v1';

/** Unambiguous alphabet (no 0/O, 1/I/L) shared with room codes. */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_PREFIX = 'BK';
const CODE_BODY_LENGTH = 6;

export interface Friend {
  /** Stable local id for this list entry. */
  id: string;
  name: string;
  /** Their friend code, if known (enables the online invite path). */
  code?: string;
  /** Their account uid, once resolved online. */
  uid?: string;
  addedAt: number;
}

export interface MyIdentity {
  /** This device's shareable friend code. */
  friendCode: string;
  /** Last name used (for convenience). */
  name?: string;
}

/* ------------------------------------------------------------------ */
/* Friend codes (pure)                                                 */
/* ------------------------------------------------------------------ */

export function generateFriendCode(): string {
  let body = '';
  for (let i = 0; i < CODE_BODY_LENGTH; i++) {
    body += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return CODE_PREFIX + body;
}

/** Trim, uppercase, strip spaces/dashes. */
export function normalizeFriendCode(input: string): string {
  return input.trim().toUpperCase().replace(/[\s-]+/g, '');
}

export function isValidFriendCode(input: string): boolean {
  return /^BK[A-Z0-9]{6}$/.test(normalizeFriendCode(input));
}

/** Pretty form for display, e.g. "BK-7Q2K9M". */
export function formatFriendCode(code: string): string {
  const c = normalizeFriendCode(code);
  return c.length === 8 ? `${c.slice(0, 2)}-${c.slice(2)}` : c;
}

/* ------------------------------------------------------------------ */
/* Invite link / message (pure)                                        */
/* ------------------------------------------------------------------ */

/** A deep link that pre-fills the join code, e.g. ".../?room=BK7Q2". */
export function buildInviteLink(roomCode: string, origin: string): string {
  const base = origin.replace(/[?#].*$/, '').replace(/\/$/, '');
  return `${base}/?room=${encodeURIComponent(roomCode)}`;
}

/** A friendly, ready-to-send invite message addressed to a friend. */
export function buildInviteText(
  friendName: string,
  roomCode: string,
  link: string,
): string {
  const who = friendName.trim() ? `${friendName.trim()}, ` : '';
  return `${who}fancy a game of Ball Knowledge? Join my room ${roomCode}: ${link}`;
}

/* ------------------------------------------------------------------ */
/* Local friends list (localStorage)                                   */
/* ------------------------------------------------------------------ */

export function getFriends(): Friend[] {
  try {
    const raw = localStorage.getItem(FRIENDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as Friend[]) : [];
  } catch {
    return [];
  }
}

function saveFriends(list: Friend[]): void {
  try {
    localStorage.setItem(FRIENDS_KEY, JSON.stringify(list));
  } catch {
    /* storage unavailable */
  }
}

export interface AddFriendInput {
  name: string;
  code?: string;
  uid?: string;
}

/**
 * Add a friend. Returns the updated list. De-dupes on friend code (case-
 * insensitive) when a code is supplied, otherwise on a case-insensitive name.
 * Ignores blank names.
 */
export function addFriend(input: AddFriendInput): Friend[] {
  const name = input.name.trim();
  if (!name) return getFriends();
  const code = input.code ? normalizeFriendCode(input.code) : undefined;

  const list = getFriends();
  const dupe = list.find((f) =>
    code && f.code
      ? f.code === code
      : f.name.trim().toLowerCase() === name.toLowerCase(),
  );
  if (dupe) {
    // Merge any newly-known details onto the existing entry.
    dupe.name = name;
    if (code) dupe.code = code;
    if (input.uid) dupe.uid = input.uid;
    saveFriends(list);
    return list;
  }

  const next: Friend = { id: uid(), name, addedAt: Date.now(), ...(code ? { code } : {}), ...(input.uid ? { uid: input.uid } : {}) };
  const updated = [...list, next];
  saveFriends(updated);
  return updated;
}

export function removeFriend(id: string): Friend[] {
  const updated = getFriends().filter((f) => f.id !== id);
  saveFriends(updated);
  return updated;
}

export function renameFriend(id: string, name: string): Friend[] {
  const trimmed = name.trim();
  const list = getFriends();
  const f = list.find((x) => x.id === id);
  if (f && trimmed) {
    f.name = trimmed;
    saveFriends(list);
  }
  return list;
}

/* ------------------------------------------------------------------ */
/* This device's identity                                              */
/* ------------------------------------------------------------------ */

/** This device's friend code (generated + persisted on first read). */
export function getMyIdentity(): MyIdentity {
  try {
    const raw = localStorage.getItem(ME_KEY);
    if (raw) return JSON.parse(raw) as MyIdentity;
  } catch {
    /* fall through to generate */
  }
  const fresh: MyIdentity = { friendCode: generateFriendCode() };
  try {
    localStorage.setItem(ME_KEY, JSON.stringify(fresh));
  } catch {
    /* storage unavailable */
  }
  return fresh;
}

export function setMyName(name: string): MyIdentity {
  const me = getMyIdentity();
  const next = { ...me, name: name.trim() || undefined };
  try {
    localStorage.setItem(ME_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable */
  }
  return next;
}
