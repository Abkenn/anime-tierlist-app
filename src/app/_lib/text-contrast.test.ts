import { expect, it } from 'vitest';
import { averagePixelColor, contrastingTextColor } from './text-contrast';
import { layoutExportBoard } from './tierlist-export-layout';
import { titleSampleSize } from './title-contrast';
import { boardWatermarkColor, watermarkTextColor } from './watermark-contrast';

const pixels = (value: number) =>
  Uint8Array.from({ length: titleSampleSize ** 2 * 4 }, (_, index) =>
    index % 4 === 3 ? 255 : value,
  );

it('keeps the strongest-contrast default while allowing a relaxed preference for light text', () => {
  expect(contrastingTextColor('#e68e8e')).toBe('#171717');
  expect(contrastingTextColor('#e68e8e', { minimumLightContrast: 1.15 })).toBe('#ededeb');
  expect(contrastingTextColor('#ffffff', { minimumLightContrast: 1.3 })).toBe('#171717');
  expect(contrastingTextColor('#000000', { lightColor: '#ffffff' })).toBe('#ffffff');
  expect(contrastingTextColor('#ffffff', { darkColor: '#000000' })).toBe('#000000');
});

it('composites translucent samples, backing and text before comparing contrast', () => {
  expect(averagePixelColor([255, 255, 255, 0])).toBe('#1c1c1c');
  expect(averagePixelColor([255, 255, 255, 128], '#000000')).toBe('#808080');
  expect(contrastingTextColor('#000000', { minimumLightContrast: 2, textOpacity: 0 })).toBe(
    '#171717',
  );
  expect(watermarkTextColor(pixels(0))).toBe('#ededeb');
  expect(watermarkTextColor(pixels(210))).toBe('#ededeb');
  expect(watermarkTextColor(pixels(255))).toBe('#171717');
  expect(watermarkTextColor([])).toBe('#ededeb');
});

it('samples the bottom row rather than unrelated bright posters elsewhere', () => {
  const board = layoutExportBoard({
    version: 1,
    ranks: ['S', 'Watching'],
    imageMode: 'cover',
    rankDetails: { Watching: { label: 'Watching', color: '#ffffff' } },
    items: [
      {
        id: 'bottom',
        rank: 'Watching',
        label: '',
        image: { src: '/white.jpg', width: 160, height: 160, alt: '' },
      },
    ],
  });
  const input = { ...board, mode: 'cover' as const };
  expect(boardWatermarkColor(input, new Map([['/white.jpg', pixels(255)]]))).toBe('#171717');
  expect(boardWatermarkColor(input, new Map([['/white.jpg', pixels(0)]]))).toBe('#ededeb');
});
