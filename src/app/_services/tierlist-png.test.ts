// @vitest-environment node

import sharp from 'sharp';
import { expect, it, vi } from 'vitest';
import { previewWatermark as mark } from '@/app/_lib/preview-watermark';

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));

import { renderExportTextPaths } from './export-text-paths';
import { renderTierlistPng } from './tierlist-png';

it('bakes watermark lettering into the bottom row of the PNG', async () => {
  const png = await renderTierlistPng({
    version: 1,
    imageMode: 'natural',
    ranks: ['S'],
    rankDetails: { S: { label: 'S', color: '#ffffff' } },
    items: [],
  });
  const { data, info } = await sharp(png)
    .extract({
      left: mark.x * 2,
      top: (160 - mark.bottom - mark.height) * 2,
      width: 280,
      height: mark.height * 2,
    })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const brightness = Array.from(
    { length: info.width * info.height },
    (_, pixel) => data[pixel * info.channels],
  );
  expect(Math.min(...brightness)).toBeGreaterThan(180);
  expect(Math.max(...brightness) - Math.min(...brightness)).toBeGreaterThan(10);
});

it('renders the exported board layout as a bounded PNG with local posters and edited titles', async () => {
  const png = await renderTierlistPng({
    version: 1,
    imageMode: 'natural',
    ranks: ['S', 'Watching'],
    items: [
      {
        id: 'sample',
        rank: 'S',
        label: 'TEST',
        image: {
          src: '/tier-samples/square.svg',
          width: 400,
          height: 400,
          alt: 'TEST',
        },
        trim: { left: 0.25, top: 0, right: 1, bottom: 1 },
        title: {
          text: 'English title',
          color: '#ffffff',
          position: 'bottom',
          wrap: true,
        },
      },
    ],
  });
  const image = await sharp(png).metadata();
  expect(image.format).toBe('png');
  expect(image.height).toBe(640);
  expect(png.length).toBeLessThanOrEqual(2_500_000);
  expect(image.width).toBeGreaterThan(600);
});

it('outlines rank and poster text without relying on SVG text or installed fonts', async () => {
  const paths = await renderExportTextPaths({
    version: 1,
    imageMode: 'natural',
    ranks: ['S'],
    rankDetails: { S: { label: 'S+ 日本語 Чудово', color: '#ffffff' } },
    items: [
      {
        id: 'text',
        rank: 'S',
        label: 'Unknown',
        title: {
          text: 'Oshi no Ko',
          position: 'bottom',
          color: '#ffffff',
          wrap: false,
        },
      },
    ],
  });
  expect(paths).toContain('<path d="');
  expect(paths).not.toContain('<text');
  expect(paths).toContain('non-scaling-stroke');
});
