import { describe, expect, it } from 'vitest';
import {
  centerTierTrim,
  fullImageTrim,
  getTierTrimFrame,
  getTrimmedImage,
  moveTierTrim,
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

describe('custom crop positioning', () => {
  const trim = { left: 0.25, top: 0.1, right: 0.75, bottom: 0.9 };

  it('clamps panning at the image bounds without resizing the crop', () => {
    expect(moveTierTrim(trim, { x: 2, y: -2 })).toEqual({
      left: 0.5,
      right: 1,
      top: 0,
      bottom: 0.8,
    });
    expect(moveTierTrim(fullImageTrim, { x: 1, y: -1 })).toEqual(fullImageTrim);
    expect(centerTierTrim(moveTierTrim(trim, { x: 0.2, y: 0 }))).toEqual({
      left: 0.25,
      right: 0.75,
      top: (1 - 0.8) / 2,
      bottom: (1 - 0.8) / 2 + 0.8,
    });
  });

  it('positions the full image behind a centered landscape crop in a taller slot', () => {
    const frame = getTierTrimFrame({
      bounds: { x: 100, y: 200, width: 80, height: 100 },
      image,
      trim: { left: 0.25, top: 0.25, right: 0.75, bottom: 0.75 },
    });

    expect(frame).toEqual({ x: 60, y: 205, width: 160, height: 90 });
  });
});
