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

export const moveTierTrim = (
  trim: TierImageTrim,
  offset: { x: number; y: number },
): TierImageTrim => {
  const width = trim.right - trim.left;
  const height = trim.bottom - trim.top;
  const left = Math.max(0, Math.min(1 - width, trim.left + offset.x));
  const top = Math.max(0, Math.min(1 - height, trim.top + offset.y));

  return { left, top, right: left + width, bottom: top + height };
};

export const centerTierTrim = (trim: TierImageTrim): TierImageTrim => {
  const width = trim.right - trim.left;
  const height = trim.bottom - trim.top;
  const left = (1 - width) / 2;
  const top = (1 - height) / 2;

  return { left, top, right: left + width, bottom: top + height };
};

export const getTrimViewBox = (image: TierImage, trim: TierImageTrim) =>
  `${image.width * trim.left} ${image.height * trim.top} ${image.width * (trim.right - trim.left)} ${image.height * (trim.bottom - trim.top)}`;

type TrimFrameInput = {
  bounds: { x: number; y: number; width: number; height: number };
  image: TierImage;
  trim: TierImageTrim;
};

export const getTierTrimFrame = ({ bounds, image, trim }: TrimFrameInput) => {
  const cropped = getTrimmedImage(image, trim);
  const scale = Math.min(
    bounds.width / cropped.width,
    bounds.height / cropped.height,
  );
  const width = image.width * scale;
  const height = image.height * scale;

  return {
    x:
      bounds.x + (bounds.width - cropped.width * scale) / 2 - trim.left * width,
    y:
      bounds.y +
      (bounds.height - cropped.height * scale) / 2 -
      trim.top * height,
    width,
    height,
  };
};
