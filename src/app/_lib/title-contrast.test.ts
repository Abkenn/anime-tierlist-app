import { expect, it } from 'vitest';
import type { TierItemData } from '@/app/_types/tierlist.types';
import { localTierlistSchema } from './local-tierlist';
import { usesAutomaticTitleColor } from './tier-item-title';
import { contrastingTitleColor, titleSampleSize } from './title-contrast';

it('chooses opposite text colors for bright and dark title regions, including crops', () => {
  const pixels = new Uint8ClampedArray(titleSampleSize * titleSampleSize * 4);
  for (let y = 0; y < titleSampleSize; y += 1) {
    for (let x = 0; x < titleSampleSize; x += 1) {
      const offset = (y * titleSampleSize + x) * 4;
      pixels.set(
        [
          y < titleSampleSize / 2 ? 255 : 0,
          y < titleSampleSize / 2 ? 255 : 0,
          y < titleSampleSize / 2 ? 255 : 0,
          255,
        ],
        offset,
      );
    }
  }
  const item = {
    id: 'contrast',
    label: 'Contrast',
    rank: 'S',
    image: { src: '/poster.jpg', width: 400, height: 600, alt: '' },
    title: {
      text: 'TEST',
      wrap: false,
      position: 'top',
      color: '#ffffff',
      autoColor: true,
    },
  } satisfies TierItemData;
  expect(contrastingTitleColor(pixels, item, 'natural')).toBe('#171717');
  expect(
    contrastingTitleColor(
      pixels,
      { ...item, title: { ...item.title, position: 'bottom' } },
      'natural',
    ),
  ).toBe('#ededeb');
  expect(
    contrastingTitleColor(
      pixels,
      { ...item, trim: { left: 0, right: 1, top: 0.6, bottom: 1 } },
      'natural',
    ),
  ).toBe('#ededeb');
  expect(usesAutomaticTitleColor({ ...item.title, autoColor: undefined })).toBe(
    true,
  );
  expect(usesAutomaticTitleColor({ ...item.title, autoColor: false })).toBe(
    false,
  );
  expect(
    usesAutomaticTitleColor({
      ...item.title,
      color: '#ff0000',
      autoColor: undefined,
    }),
  ).toBe(false);
  expect(
    localTierlistSchema.parse({
      version: 1,
      seed: 'a'.repeat(64),
      revision: 0,
      ranks: ['S'],
      imageMode: 'natural',
      items: [item],
    }).items[0].title?.autoColor,
  ).toBe(true);
});
