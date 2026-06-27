import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  generateFriendCode,
  normalizeFriendCode,
  isValidFriendCode,
  formatFriendCode,
  buildInviteLink,
  buildInviteText,
  getFriends,
  addFriend,
  removeFriend,
  renameFriend,
  getMyIdentity,
} from './friends';

describe('friend codes', () => {
  it('generates valid codes', () => {
    for (let i = 0; i < 50; i++) {
      expect(isValidFriendCode(generateFriendCode())).toBe(true);
    }
  });

  it('normalises input', () => {
    expect(normalizeFriendCode(' bk-7q2-k9m ')).toBe('BK7Q2K9M');
  });

  it('rejects malformed codes', () => {
    expect(isValidFriendCode('BK123')).toBe(false); // too short
    expect(isValidFriendCode('XY7Q2K9M')).toBe(false); // wrong prefix
    expect(isValidFriendCode('BK7Q2K9MX')).toBe(false); // too long
  });

  it('formats for display', () => {
    expect(formatFriendCode('BK7Q2K9M')).toBe('BK-7Q2K9M');
  });
});

describe('invite link + text', () => {
  it('builds a clean room deep link from any origin', () => {
    expect(buildInviteLink('BK7Q2', 'https://example.com/footballgame/')).toBe(
      'https://example.com/footballgame/?room=BK7Q2',
    );
    expect(buildInviteLink('BK7Q2', 'https://example.com/footballgame/?room=OLD#x')).toBe(
      'https://example.com/footballgame/?room=BK7Q2',
    );
  });

  it('addresses the invite to the friend and includes the code + link', () => {
    const link = 'https://x/?room=BK7Q2';
    const text = buildInviteText('Jonas', 'BK7Q2', link);
    expect(text).toContain('Jonas');
    expect(text).toContain('BK7Q2');
    expect(text).toContain(link);
  });

  it('omits the name when blank', () => {
    expect(buildInviteText('  ', 'BK7Q2', 'link').startsWith('fancy')).toBe(true);
  });
});

describe('friends list', () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, String(v)),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('adds and lists friends', () => {
    addFriend({ name: 'Jonas' });
    addFriend({ name: 'Sara', code: 'BK7Q2K9M' });
    const list = getFriends();
    expect(list).toHaveLength(2);
    expect(list.map((f) => f.name)).toEqual(['Jonas', 'Sara']);
    expect(list[1].code).toBe('BK7Q2K9M');
  });

  it('ignores blank names', () => {
    addFriend({ name: '   ' });
    expect(getFriends()).toHaveLength(0);
  });

  it('de-dupes by code and merges details', () => {
    addFriend({ name: 'Sara', code: 'BK7Q2K9M' });
    addFriend({ name: 'Sara B', code: 'bk-7q2-k9m', uid: 'u123' });
    const list = getFriends();
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('Sara B');
    expect(list[0].uid).toBe('u123');
  });

  it('de-dupes by name when no code', () => {
    addFriend({ name: 'Jonas' });
    addFriend({ name: 'jonas' });
    expect(getFriends()).toHaveLength(1);
  });

  it('removes and renames', () => {
    addFriend({ name: 'Jonas' });
    const id = getFriends()[0].id;
    renameFriend(id, 'Jonas United');
    expect(getFriends()[0].name).toBe('Jonas United');
    removeFriend(id);
    expect(getFriends()).toHaveLength(0);
  });

  it('generates a stable identity code', () => {
    const a = getMyIdentity();
    const b = getMyIdentity();
    expect(a.friendCode).toBe(b.friendCode);
    expect(isValidFriendCode(a.friendCode)).toBe(true);
  });
});
