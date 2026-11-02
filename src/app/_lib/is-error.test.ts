import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import { isError } from './is-error';

describe('error detection', () => {
  it('recognizes cross-realm errors and rejects error-shaped objects', () => {
    expect(isError(runInNewContext('new Error("Different realm")'))).toBe(true);
    expect(isError(new TypeError('Network failed'))).toBe(true);
    expect(
      isError({ message: 'Fake error', [Symbol.toStringTag]: 'Error' }),
    ).toBe(false);
    expect(isError(null)).toBe(false);
  });

  it('retains existing behavior when native detection is unavailable', () => {
    const descriptor = Object.getOwnPropertyDescriptor(Error, 'isError');
    Object.defineProperty(Error, 'isError', {
      configurable: true,
      value: undefined,
    });

    try {
      expect(isError(new Error('Same realm'))).toBe(true);
      expect(isError({ message: 'Fake error' })).toBe(false);
      expect(isError('Failure')).toBe(false);
    } finally {
      if (descriptor) {
        Object.defineProperty(Error, 'isError', descriptor);
      } else {
        Reflect.deleteProperty(Error, 'isError');
      }
    }
  });
});
