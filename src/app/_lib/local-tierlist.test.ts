import { describe, expect, it, vi } from 'vitest';
import { createUserSeed } from './local-tierlist';

describe('seed hex encoding', () => {
  it.each(['native', 'fallback'])(
    'preserves all 32 random bytes with %s encoding',
    (mode) => {
      const bytes = Uint8Array.from({ length: 32 }, (_, index) => index);
      const expected =
        '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f';
      const descriptor = Object.getOwnPropertyDescriptor(
        Uint8Array.prototype,
        'toHex',
      );
      const native = vi.fn(() => expected);
      const random = vi.spyOn(crypto, 'getRandomValues').mockReturnValue(bytes);

      Object.defineProperty(Uint8Array.prototype, 'toHex', {
        configurable: true,
        value: mode === 'native' ? native : undefined,
      });

      try {
        expect(createUserSeed()).toBe(expected);
        expect(random).toHaveBeenCalledWith(expect.any(Uint8Array));
        if (mode === 'native') {
          expect(native).toHaveBeenCalledOnce();
          expect(native.mock.contexts[0]).toBe(bytes);
        }
      } finally {
        random.mockRestore();
        if (descriptor) {
          Object.defineProperty(Uint8Array.prototype, 'toHex', descriptor);
        } else {
          Reflect.deleteProperty(Uint8Array.prototype, 'toHex');
        }
      }
    },
  );
});
