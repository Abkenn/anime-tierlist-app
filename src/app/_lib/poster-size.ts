import type { PosterSize, TierImageMode, TierItemData } from '@/app/_types/tierlist.types';
import { getTierItemSize, layoutTierItems } from './tier-item-layout';

type PosterSizeInput = {
  mode: PosterSize;
  imageMode: TierImageMode;
  items: TierItemData[];
  autoWidth?: number;
  autoMinimum?: number;
};

const dynamicRowWidthPercent = 68;

type CrowdedPosterInput = Pick<PosterSizeInput, 'imageMode' | 'items'> & {
  capacity: number;
  ranks: string[];
  gap?: number;
};

export const getCrowdedPosterMinimum = ({
  imageMode,
  items,
  capacity,
  ranks,
  gap,
}: CrowdedPosterInput) => {
  const groups = new Map<string, TierItemData[]>();
  items.forEach((item) => {
    const rank = ranks.includes(item.rank) ? item.rank : ranks[0];
    const group = groups.get(rank) ?? [];
    group.push(item);
    groups.set(rank, group);
  });
  const lines = Math.max(
    1,
    ...[...groups.values()].map(
      (group) =>
        (layoutTierItems({ items: group, size: 6, mode: imageMode, capacity, wrap: true, gap }).at(
          -1,
        )?.line ?? 0) + 1,
    ),
  );

  return Math.max(2.75, Math.floor(Math.min(6, 6 * Math.sqrt(2 / lines)) * 4) / 4);
};

export const getAutoPosterWidth = ({ imageMode, items }: Omit<PosterSizeInput, 'mode'>) => {
  const rowWidths = new Map<string, number>();
  items.forEach((item) => {
    rowWidths.set(
      item.rank,
      (rowWidths.get(item.rank) ?? 0) + getTierItemSize({ item, size: 1, mode: imageMode }).width,
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
  autoMinimum,
}: PosterSizeInput) => {
  if (mode !== 'dynamic') {
    return {
      small: 'var(--tier-small-size, 6rem)',
      medium: '8rem',
      large: '11rem',
    }[mode];
  }
  const width = autoWidth ?? getAutoPosterWidth({ imageMode, items });
  const minimum = autoMinimum === undefined ? '6rem' : `${autoMinimum}rem`;
  return `clamp(${minimum}, calc(${dynamicRowWidthPercent}cqw / ${width}), var(--tier-max-size, 7rem))`;
};
