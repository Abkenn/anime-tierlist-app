import { describe, expect, it } from 'vitest';
import {
  fullImageTrim,
  getTrimmedImage,
  resizeTierTrim,
} from './tier-image-trim';
import { getTierItemSize } from './tier-item-layout';

const image = {
  src: '/tier-samples/landscape.svg',
  width: 1600,
  height: 900,
  alt: 'TEST',
};

describe('custom ratio crop', () => {
  it('keeps opposing edges apart and clamps to the source image', () => {
    const trimmed = resizeTierTrim(fullImageTrim, 'left', 2);

    expect(trimmed.left).toBeCloseTo(0.95);
    expect(resizeTierTrim(trimmed, 'right', -1).right).toBe(1);
    expect(resizeTierTrim(fullImageTrim, 'top', -1).top).toBe(0);
  });

  it('uses the cropped aspect ratio for layout and height expansion', () => {
    const trim = { left: 0.25, right: 1, top: 0.25, bottom: 0.75 };
    const item = {
      id: 'test',
      label: 'TEST',
      rank: 'S' as const,
      image,
      trim,
      rowHeightExpansion: 0.5,
    };
    const cropped = getTrimmedImage(image, trim);
    const natural = getTierItemSize({ item, size: 4, mode: 'natural' });

    expect(cropped).toMatchObject({ width: 1200, height: 450 });
    expect(natural.height).toBeCloseTo(2.75);
    expect(natural.width / natural.height).toBeCloseTo(1200 / 450);
    expect(getTierItemSize({ item, size: 4, mode: 'cover' })).toEqual({
      width: 4,
      height: 4,
    });
  });

  it('fits a landscape cropped into portrait by height and restores its original ratio on reset', () => {
    const item = {
      id: 'test',
      label: 'TEST',
      rank: 'S' as const,
      image,
      trim: { ...fullImageTrim, right: 0.25 },
    };

    expect(getTierItemSize({ item, size: 4, mode: 'natural' })).toEqual({
      width: 16 / 9,
      height: 4,
    });
    expect(
      getTierItemSize({
        item: { ...item, trim: fullImageTrim },
        size: 4,
        mode: 'natural',
      }),
    ).toEqual({ width: 4, height: 2.25 });
  });
});
