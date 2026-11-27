import type { HexColor, TierImageMode, TierItemData } from '@/app/_types/tierlist.types';
import { averagePixelColor, contrastingTextColor } from './text-contrast';
import { fullImageTrim } from './tier-image-trim';

export const titleSampleSize = 32;

export const contrastingTitleColor = (
  pixels: ArrayLike<number>,
  item: TierItemData,
  mode: TierImageMode,
): HexColor => {
  const image = item.image;
  const area = mode === 'natural' ? { ...(item.trim ?? fullImageTrim) } : { ...fullImageTrim };
  if (mode === 'cover' && image) {
    const ratio = image.width / image.height;
    const crop = item.crop ?? { x: 0.5, y: 0.5 };
    if (ratio > 1) {
      area.left = (1 - 1 / ratio) * crop.x;
      area.right = area.left + 1 / ratio;
    } else {
      area.top = (1 - ratio) * crop.y;
      area.bottom = area.top + ratio;
    }
  }
  const band = (area.bottom - area.top) * 0.25;
  const positions = {
    top: area.top,
    middle: (area.top + area.bottom - band) / 2,
    bottom: area.bottom - band,
  };
  const top = positions[item.title?.position ?? 'bottom'];
  const selected: number[] = [];
  Array.from({ length: titleSampleSize * titleSampleSize }, (_, index) => index).forEach(
    (index) => {
      const x = ((index % titleSampleSize) + 0.5) / titleSampleSize;
      const y = (Math.floor(index / titleSampleSize) + 0.5) / titleSampleSize;
      if (x < area.left || x > area.right || y < top || y > top + band) {
        return;
      }
      selected.push(
        ...Array.from(
          { length: 4 },
          (_, channel) => pixels[index * 4 + channel] ?? (channel === 3 ? 255 : 28),
        ),
      );
    },
  );
  if (!selected.length) {
    return '#ededeb';
  }
  return contrastingTextColor(averagePixelColor(selected));
};
