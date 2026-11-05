import { expect, it } from 'vitest';
import { scrollBoardWheel } from './board-wheel-scroll';

const setup = (height = 200) => {
  const viewport = document.createElement('section');
  Object.defineProperties(viewport, {
    scrollHeight: { value: height },
    clientHeight: { value: 200 },
    scrollWidth: { value: 2000 },
    clientWidth: { value: 800 },
  });
  return viewport;
};

it('maps vertical mouse wheel to horizontal movement only when the board fits vertically', () => {
  const viewport = setup();
  const event = new WheelEvent('wheel', { deltaY: 100, cancelable: true });
  expect(scrollBoardWheel({ viewport, event })).toBe(true);
  expect(viewport.scrollLeft).toBe(100);
  expect(event.defaultPrevented).toBe(true);
  expect(
    scrollBoardWheel({
      viewport: setup(400),
      event: new WheelEvent('wheel', { deltaY: 100, cancelable: true }),
    }),
  ).toBe(false);
});

it('leaves native horizontal gestures, zoom, shift scrolling, and boundary handoff intact', () => {
  for (const options of [
    { deltaX: 100, deltaY: 10 },
    { deltaY: 100, ctrlKey: true },
    { deltaY: 100, metaKey: true },
    { deltaY: 100, shiftKey: true },
    { deltaY: -100 },
  ]) {
    const viewport = setup();
    const event = new WheelEvent('wheel', { ...options, cancelable: true });
    expect(scrollBoardWheel({ viewport, event })).toBe(false);
    expect(event.defaultPrevented).toBe(false);
  }
  const viewport = setup();
  viewport.scrollLeft = 1200;
  expect(
    scrollBoardWheel({
      viewport,
      event: new WheelEvent('wheel', { deltaY: 100, cancelable: true }),
    }),
  ).toBe(false);
});

it('normalizes line and page wheel units and clamps to the board edge', () => {
  const viewport = setup();
  scrollBoardWheel({
    viewport,
    event: new WheelEvent('wheel', {
      deltaY: 2,
      deltaMode: 1,
      cancelable: true,
    }),
  });
  expect(viewport.scrollLeft).toBe(32);
  scrollBoardWheel({
    viewport,
    event: new WheelEvent('wheel', {
      deltaY: 2,
      deltaMode: 2,
      cancelable: true,
    }),
  });
  expect(viewport.scrollLeft).toBe(1200);
});
