import type {
  HexColor,
  TierImageMode,
  TierItemData,
} from '@/app/_types/tierlist.types';
import { rankTextColor } from './rank-text-color';
import { fullImageTrim } from './tier-image-trim';

export const titleSampleSize = 32;

export const contrastingTitleColor = (
  pixels: ArrayLike<number>,
  item: TierItemData,
  mode: TierImageMode,
): HexColor => {
  const image = item.image;
  const area =
    mode === 'natural'
      ? { ...(item.trim ?? fullImageTrim) }
      : { ...fullImageTrim };
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
  const channels = [0, 0, 0];
  let count = 0;
  Array.from(
    { length: titleSampleSize * titleSampleSize },
    (_, index) => index,
  ).forEach((index) => {
    const x = ((index % titleSampleSize) + 0.5) / titleSampleSize;
    const y = (Math.floor(index / titleSampleSize) + 0.5) / titleSampleSize;
    if (x < area.left || x > area.right || y < top || y > top + band) {
      return;
    }
    const alpha = (pixels[index * 4 + 3] ?? 255) / 255;
    channels.forEach((_, channel) => {
      channels[channel] +=
        (pixels[index * 4 + channel] ?? 28) * alpha + 28 * (1 - alpha);
    });
    count += 1;
  });
  if (!count) {
    return '#ededeb';
  }
  const background: HexColor = `#${channels
    .map((value) =>
      Math.round(value / count)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;

  return rankTextColor(background);
};
