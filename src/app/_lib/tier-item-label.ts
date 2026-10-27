import type { TierItemData } from '@/app/_types/tierlist.types';

export const getTierItemLabel = (
  item: Pick<TierItemData, 'label' | 'title'>,
) =>
  item.label.trim() && item.label.trim().toLowerCase() !== 'unknown'
    ? item.label.trim()
    : item.title?.text.trim().replace(/\s+/gu, ' ') || 'Unknown';

export const matchesTierItemLabel = (
  item: Pick<TierItemData, 'label' | 'title'>,
  query: string,
) =>
  getTierItemLabel(item)
    .normalize('NFKC')
    .toLocaleLowerCase()
    .includes(query.trim().normalize('NFKC').toLocaleLowerCase());
