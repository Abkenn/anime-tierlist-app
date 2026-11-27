import type { HexColor, TierImageMode } from '@/app/_types/tierlist.types';
import { previewWatermark as mark } from './preview-watermark';
import { averagePixelColor, contrastingTextColor } from './text-contrast';
import { type ExportRow, exportImageFrame, exportPosterSize } from './tierlist-export-layout';
import { titleSampleSize } from './title-contrast';

export const watermarkTextColor = (pixels: ArrayLike<number>): HexColor => {
  const count = Math.floor(pixels.length / 4);
  if (!count) {
    return mark.color;
  }
  return contrastingTextColor(averagePixelColor(pixels), {
    lightColor: mark.color,
    textOpacity: mark.opacity,
    minimumLightContrast: 1.15,
    backing: { color: mark.background, opacity: mark.backgroundOpacity },
  });
};

type WatermarkBoard = { rows: ExportRow[]; height: number; mode: TierImageMode };

export const watermarkPosters = ({ rows }: WatermarkBoard) =>
  rows.at(-1)?.posters.filter((box) => box.x < mark.x + mark.width) ?? [];

export const boardWatermarkColor = (
  board: WatermarkBoard,
  samples: ReadonlyMap<string, ArrayLike<number>>,
): HexColor => {
  const row = board.rows.at(-1);
  const posters = watermarkPosters(board);
  const pixels = Array.from({ length: titleSampleSize ** 2 }, (_, index) => {
    const x = mark.x + (((index % titleSampleSize) + 0.5) * mark.width) / titleSampleSize;
    const y =
      board.height -
      mark.bottom -
      mark.height +
      ((Math.floor(index / titleSampleSize) + 0.5) * mark.height) / titleSampleSize;
    const box = posters.find(
      (poster) =>
        x >= poster.x &&
        x < poster.x + poster.width &&
        y >= poster.y &&
        y < poster.y + poster.height,
    );
    const frame = box && exportImageFrame(box, board.mode);
    const image = box?.item.image;
    const sample = image && samples.get(image.src);
    if (
      frame &&
      image &&
      sample &&
      x >= frame.x &&
      x < frame.x + frame.width &&
      y >= frame.y &&
      y < frame.y + frame.height
    ) {
      const sx = Math.min(
        titleSampleSize - 1,
        Math.max(
          0,
          Math.floor(
            ((frame.source.x + ((x - frame.x) / frame.width) * frame.source.width) / image.width) *
              titleSampleSize,
          ),
        ),
      );
      const sy = Math.min(
        titleSampleSize - 1,
        Math.max(
          0,
          Math.floor(
            ((frame.source.y + ((y - frame.y) / frame.height) * frame.source.height) /
              image.height) *
              titleSampleSize,
          ),
        ),
      );
      const offset = (sy * titleSampleSize + sx) * 4;
      return Array.from({ length: 4 }, (_, channel) => sample[offset + channel]);
    }
    const background = row && x < exportPosterSize ? row.color : mark.background;

    return [
      ...[1, 3, 5].map((offset) => Number.parseInt(background.slice(offset, offset + 2), 16)),
      255,
    ];
  }).flat();

  return watermarkTextColor(pixels);
};
