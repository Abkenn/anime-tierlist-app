import { expect, it } from 'vitest';
import {
  exportCanvasSize,
  exportImageFrame,
  exportPosterSize,
  layoutExportBoard,
} from './tierlist-export-layout';
import type { TierlistDocument } from './tierlist-sync';

const document: TierlistDocument = {
  version: 1,
  ranks: ['S+', 'Watching'],
  imageMode: 'natural',
  items: [
    {
      id: 'one',
      label: 'One',
      rank: 'S+',
      image: { src: '/poster.jpg', alt: 'One', width: 400, height: 600 },
      trim: { left: 0.25, right: 0.75, top: 0, bottom: 1 },
    },
  ],
};

it('lays out every rank with the original crop geometry and an extra poster of breathing room', () => {
  const board = layoutExportBoard(document);
  const box = board.rows[0].posters[0];
  expect(board.height).toBe(exportPosterSize * 2);
  expect(box.width).toBeCloseTo(box.height / 3);
  expect(board.width - board.rows[0].end).toBeCloseTo(box.width, 0);
  expect(exportImageFrame(box, 'natural')?.source).toEqual({
    x: 100,
    y: 0,
    width: 200,
    height: 600,
  });
  const cover = exportImageFrame(
    {
      ...box,
      width: 160,
      height: 160,
      item: { ...box.item, crop: { x: 0, y: 1 } },
    },
    'cover',
  );
  expect(cover?.y).toBeCloseTo(box.y - 80);
});

it('bounds high-resolution exports by both pixel count and maximum dimension, including 100 ranks', () => {
  for (const [width, height] of [
    [1200, 1600],
    [9000, 16000],
    [100, 32000],
  ]) {
    const output = exportCanvasSize(width, height);
    expect(output.width * output.height).toBeLessThanOrEqual(16_000_000);
    expect(Math.max(output.width, output.height)).toBeLessThanOrEqual(16384);
    expect(output.width / output.height).toBeCloseTo(width / height, 2);
  }
});
