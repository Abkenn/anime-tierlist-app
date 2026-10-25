import { expect, it } from 'vitest';
import { formatRelativeTime } from './relative-time';

it('shows actual version ages without inventing dates for older saves or clock skew', () => {
  const now = 2_000_000;

  expect(formatRelativeTime(undefined, now)).toBe('time unavailable');
  expect(formatRelativeTime(now - 30_000, now)).toBe('just now');
  expect(formatRelativeTime(now - 120_000, now)).toBe('2 minutes ago');
  expect(formatRelativeTime(now - 3_600_000, now)).toBe('1 hour ago');
  expect(formatRelativeTime(now + 60_000, now)).toBe('just now');
});
