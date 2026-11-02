import { expect, it } from 'vitest';
import { stabilizePosterWidth } from './poster-size';

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

it('does not bounce back after crossing a resizing threshold', () => {
  const smaller = stabilizePosterWidth(13, 17);
  expect(stabilizePosterWidth(smaller, 16)).toBe(17);
  const larger = stabilizePosterWidth(13, 9);
  expect(stabilizePosterWidth(larger, 10)).toBe(9);
});
