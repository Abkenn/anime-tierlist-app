import { describe, expect, it } from 'vitest';
import {
  isOutdatedTierlistClient,
  tierlistErrorMessage,
  tierlistUpdateMessage,
} from './tierlist-error';

describe('tierlist error messages', () => {
  it('recognizes an outdated action without exposing its ID or framework link', () => {
    const error = new Error(
      'Server Action "old-action-id" was not found on the server.\nRead more: https://nextjs.org/docs/messages/failed-to-find-server-action',
    );

    expect(isOutdatedTierlistClient(error)).toBe(true);
    expect(tierlistErrorMessage(error, 'Try again.')).toBe(
      tierlistUpdateMessage,
    );
    expect(tierlistErrorMessage(error, 'Try again.')).not.toContain(
      'old-action-id',
    );
  });

  it('keeps connection failures separate from updates and preserves user validation messages', () => {
    const network = new TypeError('Failed to fetch');

    expect(isOutdatedTierlistClient(network)).toBe(false);
    expect(tierlistErrorMessage(network, 'Couldn’t connect.')).toBe(
      'Couldn’t connect.',
    );
    expect(
      tierlistErrorMessage(new Error('Enter a valid seed.'), 'Try again.'),
    ).toBe('Enter a valid seed.');
  });
});
