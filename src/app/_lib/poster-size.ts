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
  autoWidth?: number;
};

const dynamicRowWidthPercent = 68;

export const getAutoPosterWidth = ({
  imageMode,
  items,
}: Omit<PosterSizeInput, 'mode'>) => {
  const rowWidths = new Map<string, number>();
  items.forEach((item) => {
    rowWidths.set(
      item.rank,
      (rowWidths.get(item.rank) ?? 0) +
        getTierItemSize({ item, size: 1, mode: imageMode }).width,
    );
  });
  const longest = Math.max(1, ...rowWidths.values());
  return longest + 1;
};

// Keep the initial 68% fit until the row reaches ~85%, or falls below ~51%.
export const stabilizePosterWidth = (previous: number, current: number) =>
  current > previous * 1.25 || current < previous * 0.75 ? current : previous;

export const getPosterSize = ({
  mode,
  imageMode,
  items,
  autoWidth,
}: PosterSizeInput) => {
  if (mode !== 'dynamic') {
    return { small: '6rem', medium: '8rem', large: '11rem' }[mode];
  }
  const width = autoWidth ?? getAutoPosterWidth({ imageMode, items });
  return `clamp(6rem, calc(${dynamicRowWidthPercent}cqw / ${width}), var(--tier-max-size, 10rem))`;
};
