import { describe, expect, it } from 'vitest';
import type { TierItemData } from '@/app/_types/tierlist.types';
import {
  getTierDropIndex,
  getTierItemSize,
  getTwoLineCapacity,
  layoutTierItems,
  tierItemGap,
} from './tier-item-layout';

const makeItem = (
  id: string,
  width: number,
  height: number,
  rowHeightExpansion = 0,
): TierItemData => ({
  id,
  label: id,
  rank: 'S+',
  rowHeightExpansion,
  image: { src: '/fixture.svg', alt: id, width, height },
});
const portrait = makeItem('portrait', 9, 16);
const landscape = makeItem('landscape', 16, 9);
const panorama = makeItem('panorama', 3, 1, 1);

const pack = (items: TierItemData[], capacity = 100, wrap = false) =>
  layoutTierItems({ items, size: 4, mode: 'natural', capacity, wrap });

describe('tier item layout', () => {
  it('keeps both square modes in square slots', () => {
    expect(
      getTierItemSize({ item: portrait, size: 4, mode: 'contain' }),
    ).toEqual({ width: 4, height: 4 });
    expect(
      getTierItemSize({ item: landscape, size: 4, mode: 'cover' }),
    ).toEqual({ width: 4, height: 4 });
  });

  it('fits portraits by height and landscapes by width without stretching', () => {
    expect(
      getTierItemSize({ item: portrait, size: 4, mode: 'natural' }),
    ).toEqual({ width: 2.25, height: 4 });
    expect(
      getTierItemSize({ item: landscape, size: 4, mode: 'natural' }),
    ).toEqual({ width: 4, height: 2.25 });
    expect(pack([landscape])[0].y).toBe(0.875);
  });

  it('lets a panorama take three square widths when forced to row height', () => {
    const boxes = pack([panorama, portrait]);

    expect(boxes[0]).toMatchObject({ width: 12, height: 4 });
    expect(boxes[1].x).toBe(12 + tierItemGap);
  });

  it('interpolates landscape height while preserving aspect ratio and clamps expansion', () => {
    const partial = { ...panorama, rowHeightExpansion: 0.5 };
    const size = getTierItemSize({ item: partial, size: 4, mode: 'natural' });

    expect(size.width).toBeCloseTo(8);
    expect(size.height).toBeCloseTo(8 / 3);
    expect(size.width / size.height).toBeCloseTo(3);
    expect(
      getTierItemSize({
        item: { ...panorama, rowHeightExpansion: -1 },
        size: 4,
        mode: 'natural',
      }).width,
    ).toBeCloseTo(4);
    expect(
      getTierItemSize({
        item: { ...panorama, rowHeightExpansion: 2 },
        size: 4,
        mode: 'natural',
      }).width,
    ).toBeCloseTo(12);
  });

  it('uses actual item midpoints for insertion, including empty ranks', () => {
    const boxes = pack([portrait, panorama, landscape]);

    expect(getTierDropIndex([], 100, 0)).toBe(0);
    expect(getTierDropIndex(boxes, 1, 0)).toBe(0);
    expect(getTierDropIndex(boxes, 3, 0)).toBe(1);
    expect(getTierDropIndex(boxes, 12, 0)).toBe(2);
    expect(getTierDropIndex(boxes, 100, 0)).toBe(3);
  });

  it('fits a mixed-width ordered sequence in at most two lines', () => {
    const items = [portrait, landscape, panorama, portrait, landscape];
    const capacity = getTwoLineCapacity({ items, size: 4, mode: 'natural' });
    const boxes = pack(items, capacity, true);

    expect(new Set(boxes.map((box) => box.line)).size).toBe(2);
    expect(boxes.every((box) => box.x + box.width <= capacity + 0.001)).toBe(
      true,
    );
    expect(boxes.map((box) => box.id)).toEqual(items.map((item) => item.id));
    const secondLine = boxes.find((box) => box.line === 1);

    expect(getTierDropIndex(boxes, -1, 1)).toBe(secondLine?.index);
  });

  it('falls back to squares for invalid image metadata', () => {
    expect(
      getTierItemSize({
        item: makeItem('invalid', 0, 0),
        size: 4,
        mode: 'natural',
      }),
    ).toEqual({ width: 4, height: 4 });
  });
});
