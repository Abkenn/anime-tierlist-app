// @vitest-environment node

import sharp from 'sharp';
import { expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));

import { renderTierlistPng } from './tierlist-png';

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
