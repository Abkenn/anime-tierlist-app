import { expect, it } from 'vitest';
import { getCrowdedPosterMinimum, stabilizePosterWidth } from './poster-size';

it('progressively reduces Auto below Small for crowded rows with a readable floor', () => {
  const minimum = (count: number) =>
    getCrowdedPosterMinimum({
      imageMode: 'cover',
      capacity: 24.5,
      ranks: ['A'],
      items: Array.from({ length: count }, (_, index) => ({
        id: String(index),
        label: String(index),
        rank: 'A',
      })),
    });
  expect(minimum(8)).toBe(6);
  const sizes = [12, 16, 20, 24].map(minimum);
  expect(sizes[0]).toBeLessThan(6);
  sizes.slice(1).forEach((size, index) => {
    expect(size).toBeLessThan(sizes[index]);
  });
  expect(minimum(5000)).toBe(2.75);
});

it('holds Auto size through small edits and resizes only beyond its buffer', () => {
  // Twelve square posters plus the rank label initially fit to 68%.
  let width = 13;
  for (const current of [14, 15, 16, 15, 14, 13, 12, 11, 10]) {
    width = stabilizePosterWidth(width, current);
    expect(width).toBe(13);
  }
  expect(stabilizePosterWidth(width, 17)).toBe(17);
  expect(stabilizePosterWidth(width, 9)).toBe(9);
});

it('uses thumbnail-sized Auto cells on narrow boards and keeps a bounded floor for huge lists', () => {
  const minimum = (count: number) =>
    getCrowdedPosterMinimum({
      imageMode: 'cover',
      capacity: 16,
      ranks: ['A'],
      compact: true,
      gap: 0,
      items: Array.from({ length: count }, (_, index) => ({
        id: String(index),
        label: String(index),
        rank: 'A',
      })),
    });
  expect(minimum(8)).toBe(2);
  expect(minimum(5000)).toBe(1);
});

it('does not bounce back after crossing a resizing threshold', () => {
  const smaller = stabilizePosterWidth(13, 17);
  expect(stabilizePosterWidth(smaller, 16)).toBe(17);
  const larger = stabilizePosterWidth(13, 9);
  expect(stabilizePosterWidth(larger, 10)).toBe(9);
});
