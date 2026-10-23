import type { TierImageMode, TierItemData } from '@/app/_types/tierlist.types';

import { getTrimmedImage } from './tier-image-trim';

export const tierItemGap = 0.125;

export type TierItemBox = {
  id: string;
  index: number;
  line: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

type ItemSizeInput = {
  item: TierItemData;
  size: number;
  mode: TierImageMode;
};

export const getTierItemSize = ({ item, size, mode }: ItemSizeInput) => {
  const image = item.image && getTrimmedImage(item.image, item.trim);
  const ratio = image ? image.width / image.height : 1;

  if (mode !== 'natural' || !Number.isFinite(ratio) || ratio <= 0) {
    return { width: size, height: size };
  }

  if (ratio <= 1) {
    return { width: size * ratio, height: size };
  }

  const expansion = Number.isFinite(item.rowHeightExpansion ?? 1)
    ? Math.max(0, Math.min(1, item.rowHeightExpansion ?? 1))
    : 1;
  const defaultHeight = size / ratio;
  const height = defaultHeight + (size - defaultHeight) * expansion;

  return { width: height * ratio, height };
};

type CapacityInput = {
  items: TierItemData[];
  size: number;
  mode: TierImageMode;
};

export const getTierLineWidth = ({ items, size, mode }: CapacityInput) =>
  items.reduce(
    (width, item, index) =>
      width +
      getTierItemSize({ item, size, mode }).width +
      (index ? tierItemGap : 0),
    0,
  );

export const getTwoLineCapacity = ({ items, size, mode }: CapacityInput) => {
  const widths = items.reduce<number[]>(
    (sums, item) => {
      sums.push(
        (sums.at(-1) ?? 0) +
          getTierItemSize({ item, size, mode }).width +
          tierItemGap,
      );

      return sums;
    },
    [0],
  );
  const total = widths.at(-1) ?? 0;

  return Math.min(
    ...widths.map((left) =>
      Math.max(
        Math.max(0, left - tierItemGap),
        Math.max(0, total - left - tierItemGap),
      ),
    ),
  );
};

type LayoutInput = CapacityInput & { capacity: number; wrap: boolean };

export const layoutTierItems = ({
  items,
  size,
  mode,
  capacity,
  wrap,
}: LayoutInput) =>
  items.reduce<TierItemBox[]>((boxes, item, index) => {
    const { width, height } = getTierItemSize({ item, size, mode });
    const previous = boxes.at(-1);
    const nextX = previous ? previous.x + previous.width + tierItemGap : 0;
    const newLine =
      wrap && previous?.line === 0 && nextX + width > capacity + 0.001;
    const line = newLine ? 1 : (previous?.line ?? 0);
    const x = newLine ? 0 : nextX;

    boxes.push({
      id: item.id,
      index,
      line,
      x,
      y: line * (size + tierItemGap) + (size - height) / 2,
      width,
      height,
    });

    return boxes;
  }, []);

export const getTierDropIndex = (
  boxes: TierItemBox[],
  x: number,
  line: number,
) => {
  const candidates = boxes.filter((box) => box.line === line);
  const next = candidates.find((box) => x < box.x + box.width / 2);

  return next?.index ?? (candidates.at(-1)?.index ?? boxes.length - 1) + 1;
};
