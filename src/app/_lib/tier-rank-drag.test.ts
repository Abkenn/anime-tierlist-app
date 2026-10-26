import { expect, it } from 'vitest';
import { projectRankDrag } from './tier-rank-drag';

it('projects unequal-height rows without changing the source geometry', () => {
  const rows = [
    { rank: 'S' as const, top: 10, height: 200 },
    { rank: 'A' as const, top: 210, height: 100 },
    { rank: 'B' as const, top: 310, height: 100 },
  ];
  const projected = projectRankDrag(rows, 'S', 230);

  expect(projected.order).toEqual(['A', 'B', 'S']);
  expect([...projected.offsets]).toEqual([
    ['A', -200],
    ['B', -200],
    ['S', 200],
  ]);
  expect(rows[0].top).toBe(10);
  expect(projectRankDrag(rows, 'B', -400).order).toEqual(['B', 'S', 'A']);
});
