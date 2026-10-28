import { expect, it } from 'vitest';
import type { TierItemData } from '@/app/_types/tierlist.types';
import { projectTierItems } from './tier-item-projection';

it('keeps the same items reference when a poster returns to its original rank position', () => {
  const items: TierItemData[] = [
    { id: 'first', rank: 'S', label: 'First' },
    { id: 'other', rank: 'A', label: 'Other' },
    { id: 'second', rank: 'S', label: 'Second' },
  ];
  expect(
    projectTierItems(items, { id: 'first', rank: 'S', index: 0 }, ['S', 'A']),
  ).toBe(items);
  expect(
    projectTierItems(items, { id: 'second', rank: 'S', index: 1 }, ['S', 'A']),
  ).toBe(items);
  expect(
    projectTierItems(items, { id: 'second', rank: 'S', index: 0 }, ['S', 'A']),
  ).not.toBe(items);
});
