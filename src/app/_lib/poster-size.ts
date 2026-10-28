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
};

const dynamicRowWidthPercent = 68;

export const getPosterSize = ({ mode, imageMode, items }: PosterSizeInput) => {
  if (mode !== 'dynamic') {
    return { small: '6rem', medium: '8rem', large: '11rem' }[mode];
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
  return `clamp(6rem, calc(${dynamicRowWidthPercent}cqw / ${longest + 1}), var(--tier-max-size, 10rem))`;
};
