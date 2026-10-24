import { describe, expect, it } from 'vitest';
import { openAuthValue, sealAuthValue } from './auth-envelope';

const secret = 'ab'.repeat(32);

describe('OAuth encrypted values', () => {
  it('round-trips without deterministic ciphertext or plaintext disclosure', () => {
    const value = 'private-recovery-seed';
    const encrypted = sealAuthValue(value, 'google-seed:123', secret);

    expect(openAuthValue(encrypted, 'google-seed:123', secret)).toBe(value);
    expect(encrypted).not.toContain(value);
    expect(sealAuthValue(value, 'google-seed:123', secret)).not.toBe(encrypted);
  });

  it('rejects modification, a different purpose, and a different key', () => {
    const encrypted = sealAuthValue('secret', 'oauth-flow', secret);
    const tampered = Buffer.from(encrypted, 'base64url');
    tampered[28] = (tampered[28] ?? 0) ^ 1;

    expect(() =>
      openAuthValue(tampered.toString('base64url'), 'oauth-flow', secret),
    ).toThrow();
    expect(() => openAuthValue(encrypted, 'account-cookie', secret)).toThrow();
    expect(() =>
      openAuthValue(encrypted, 'oauth-flow', 'cd'.repeat(32)),
    ).toThrow();
  });
});
