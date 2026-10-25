import type {
  PosterSize,
  TierImageMode,
  TierItemData,
} from '@/app/_types/tierlist.types';
import { getTierItemSize } from './tier-item-layout';

type PosterSizeInput = {
  mode: PosterSize;
  imageMode: TierImageMode;
  items: TierItemData[];
  width: number;
};

export const getPosterSize = ({
  mode,
  imageMode,
  items,
  width,
}: PosterSizeInput) => {
  if (mode !== 'dynamic') {
    return { small: 6, medium: 8, large: 11 }[mode];
  }

  const rowWidths = new Map<string, number>();
  items.forEach((item) => {
    rowWidths.set(
      item.rank,
      (rowWidths.get(item.rank) ?? 0) +
        getTierItemSize({ item, size: 1, mode: imageMode }).width,
    );
  });
  const longest = Math.max(1, ...rowWidths.values());
  const maximum = width < 640 ? 7 : 11;

  return Math.max(6, Math.min(maximum, (width * 0.42) / longest / 16));
};
