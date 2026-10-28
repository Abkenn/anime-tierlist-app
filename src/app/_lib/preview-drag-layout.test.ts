import { expect, it } from 'vitest';
import { previewDropSlot, previewPosterSprites } from './preview-drag-layout';
import { layoutExportBoard } from './tierlist-export-layout';

it('projects only the source and destination rank with each poster retaining its own width', () => {
  const rows = layoutExportBoard({
    version: 1,
    imageMode: 'natural',
    ranks: ['S', 'A', 'B'],
    items: [
      { id: 'one', label: 'One', rank: 'S' },
      { id: 'two', label: 'Two', rank: 'S' },
      { id: 'three', label: 'Three', rank: 'A' },
      { id: 'four', label: 'Four', rank: 'B' },
    ],
  }).rows;
  const from = rows[0].posters[0];
  const slot = previewDropSlot(rows, from, 200, 240);
  expect(slot).toEqual({ rank: 'A', index: 0 });
  const sprites = previewPosterSprites(rows, from, slot);
  expect(sprites.map((box) => box.id)).toEqual(['two', 'one', 'three']);
  expect(sprites.find((box) => box.id === 'four')).toBeUndefined();
  expect(sprites.find((box) => box.id === 'two')?.targetX).toBe(from.x);
  expect(sprites.find((box) => box.id === 'one')?.targetY).toBe(
    rows[1].posters[0].y,
  );
  expect(rows[0].posters.map((poster) => poster.item.id)).toEqual([
    'one',
    'two',
  ]);
  expect(previewDropSlot(rows, from, 900, 240)).toEqual({
    rank: 'A',
    index: 1,
  });
  expect(previewDropSlot(rows, from, 200, -10)).toEqual({
    rank: 'S',
    index: 0,
  });
});
