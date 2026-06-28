import { describe, it, expect } from 'vitest';
import {
  buildBackup,
  dataFromBackup,
  parseBackup,
  encodeBackupCode,
  decodeBackupCode,
} from './backup';

const store = {
  bk_profile_v1: '{"wins":3}',
  bk_career_v1: '{"tier":4}',
  other_app_key: 'should-not-be-included',
  bk_name: 'Modock United',
};

describe('buildBackup', () => {
  it('captures only bk_-prefixed keys', () => {
    const file = buildBackup(store, 1234);
    expect(file.format).toBe('ball-knowledge-backup');
    expect(file.exportedAt).toBe(1234);
    expect(Object.keys(file.data).sort()).toEqual(['bk_career_v1', 'bk_name', 'bk_profile_v1']);
    expect(file.data).not.toHaveProperty('other_app_key');
  });
});

describe('dataFromBackup / parseBackup', () => {
  it('round-trips a built backup', () => {
    const file = buildBackup(store, 1);
    const json = JSON.stringify(file);
    const parsed = parseBackup(json);
    expect(parsed).not.toBeNull();
    expect(parsed!.data.bk_profile_v1).toBe('{"wins":3}');
  });

  it('rejects a non-backup object', () => {
    expect(dataFromBackup({ hello: 'world' })).toBeNull();
    expect(parseBackup('not json')).toBeNull();
    expect(parseBackup('{"format":"something-else","data":{}}')).toBeNull();
  });

  it('drops non-bk keys and non-string values on import', () => {
    const data = dataFromBackup({
      format: 'ball-knowledge-backup',
      data: { bk_ok: 'yes', evil: 'no', bk_num: 5 },
    });
    expect(data).toEqual({ bk_ok: 'yes' });
  });
});

describe('backup codes', () => {
  it('encode/decode round-trips unicode', () => {
    const json = JSON.stringify({ club: 'Tønsberg Albion ⚽' });
    const code = encodeBackupCode(json);
    expect(decodeBackupCode(code)).toBe(json);
  });
  it('returns null on a malformed code', () => {
    expect(decodeBackupCode('!!!! not base64 !!!!')).toBeNull();
  });
});
