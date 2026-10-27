import { act, renderHook } from '@testing-library/react';
import { expect, it } from 'vitest';
import { useMobileBoardScroll } from './use-mobile-board-scroll';

it('continues the same swipe into search reveal without intercepting posters or the scrollbar', () => {
  const viewport = document.createElement('div');
  const board = document.createElement('section');
  board.dataset.tierViewport = '';
  viewport.append(board);
  Object.defineProperties(viewport, {
    scrollHeight: { value: 600 },
    clientHeight: { value: 500 },
  });
  Object.defineProperties(board, {
    scrollHeight: { value: 1000 },
    clientHeight: { value: 500 },
  });
  viewport.scrollTop = 100;
  board.scrollTop = 150;
  const hook = renderHook(() =>
    useMobileBoardScroll({
      enabled: true,
      viewportRef: { current: viewport },
      boardRef: { current: viewport },
    }),
  );
  const touch = (target: Element, type: string, y: number) => {
    const event = new TouchEvent(type, {
      bubbles: true,
      cancelable: true,
      touches: [{ clientX: 20, clientY: y } as Touch],
    });
    act(() => {
      target.dispatchEvent(event);
    });

    return event;
  };

  touch(board, 'touchstart', 100);
  expect(touch(board, 'touchmove', 300).defaultPrevented).toBe(true);
  expect(board.scrollTop).toBe(0);
  expect(viewport.scrollTop).toBe(50);
  touch(board, 'touchmove', 350);
  expect(viewport.scrollTop).toBe(0);

  touch(board, 'touchstart', 350);
  expect(touch(board, 'touchmove', 400).defaultPrevented).toBe(false);
  expect(touch(board, 'touchmove', 450).defaultPrevented).toBe(false);
  expect(viewport.scrollTop).toBe(0);
  expect(board.scrollTop).toBe(0);

  const poster = document.createElement('button');
  const scrollbar = document.createElement('div');
  scrollbar.dataset.slot = 'scroll-area-scrollbar';
  board.append(poster, scrollbar);
  [poster, scrollbar].forEach((target) => {
    touch(target, 'touchstart', 350);
    expect(touch(target, 'touchmove', 100).defaultPrevented).toBe(false);
  });
  expect(viewport.scrollTop).toBe(0);
  expect(board.scrollTop).toBe(0);
  hook.unmount();
});
