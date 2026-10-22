import type { TierImage, TierImageTrim } from '@/app/_types/tierlist.types';

export const fullImageTrim: TierImageTrim = {
  left: 0,
  top: 0,
  right: 1,
  bottom: 1,
};
export type TierTrimEdge = keyof TierImageTrim;

export const resizeTierTrim = (
  trim: TierImageTrim,
  edge: TierTrimEdge,
  value: number,
): TierImageTrim => {
  const minimum = 0.05;
  const limits = {
    left: [0, trim.right - minimum],
    top: [0, trim.bottom - minimum],
    right: [trim.left + minimum, 1],
    bottom: [trim.top + minimum, 1],
  };
  const [min, max] = limits[edge];

  return { ...trim, [edge]: Math.max(min, Math.min(max, value)) };
};

export const getTrimmedImage = (
  image: TierImage,
  trim: TierImageTrim = fullImageTrim,
): TierImage => ({
  ...image,
  width: image.width * (trim.right - trim.left),
  height: image.height * (trim.bottom - trim.top),
});
