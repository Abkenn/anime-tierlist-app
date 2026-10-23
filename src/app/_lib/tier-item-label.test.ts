import { describe, expect, it } from 'vitest';
import type { TierItemData } from '@/app/_types/tierlist.types';
import { getTierItemLabel, matchesTierItemLabel } from './tier-item-label';

describe('tier item labels', () => {
  const item: TierItemData = {
    id: 'poster',
    label: 'Unknown',
    rank: 'S',
    title: {
      text: 'Your\nLie in April',
      wrap: false,
      position: 'top',
      color: '#fff',
    },
  };

  it('uses poster text only while the label is unknown', () => {
    expect(getTierItemLabel(item)).toBe('Your Lie in April');
    expect(getTierItemLabel({ ...item, title: undefined })).toBe('Unknown');
    expect(getTierItemLabel({ ...item, label: 'Season 1' })).toBe('Season 1');
  });

  it('finds labels without case or Unicode width differences', () => {
    expect(matchesTierItemLabel(item, ' YOUR LIE ')).toBe(true);
    expect(matchesTierItemLabel({ ...item, label: 'ＴＥＳＴ' }, 'test')).toBe(
      true,
    );
    expect(matchesTierItemLabel(item, 'Naruto')).toBe(false);
  });
});
