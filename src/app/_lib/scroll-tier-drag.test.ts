import { expect, it } from 'vitest';
import { scrollTierDrag } from './scroll-tier-drag';

it('scrolls at 3x speed and stops at the last tier even if a dragged image inflates scrollHeight', () => {
  document.documentElement.style.fontSize = '16px';
  const viewport = document.createElement('div');
  viewport.dataset.slot = 'scroll-area-viewport';
  const board = document.createElement('div');
  const tiers = document.createElement('ol');
  tiers.setAttribute('aria-label', 'Ranked tiers');
  board.append(tiers);
  viewport.append(board);
  document.body.append(viewport);
  Object.defineProperties(viewport, {
    scrollHeight: { value: 10000 },
    clientHeight: { value: 600 },
  });
  viewport.getBoundingClientRect = () => new DOMRect(0, 0, 800, 600);
  tiers.getBoundingClientRect = () =>
    new DOMRect(0, -viewport.scrollTop, 800, 1200);

  try {
    scrollTierDrag({ board, x: 400, y: 900, delta: 16 });
    expect(viewport.scrollTop).toBeCloseTo(18.432);

    for (let frame = 0; frame < 200; frame += 1) {
      scrollTierDrag({ board, x: 400, y: 900, delta: 16 });
    }

    expect(viewport.scrollTop).toBe(600);
    expect(scrollTierDrag({ board, x: 400, y: 900, delta: 16 })).toBe(false);
    scrollTierDrag({ board, x: 400, y: -100, delta: 16 });
    expect(viewport.scrollTop).toBeLessThan(600);
  } finally {
    viewport.remove();
    document.documentElement.style.removeProperty('font-size');
  }
});
