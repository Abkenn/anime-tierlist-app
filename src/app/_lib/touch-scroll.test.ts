import { expect, it } from 'vitest';
import { transferBoardScroll } from './touch-scroll';

it('does not drain board scrolling into a fractional gap at the workspace limit', () => {
  const workspace = document.createElement('div');
  const board = document.createElement('div');
  Object.defineProperties(workspace, {
    scrollHeight: { value: 600 },
    clientHeight: { value: 500 },
  });
  workspace.scrollTop = 99.6;
  board.scrollTop = 300;

  for (let frame = 0; frame < 100; frame += 1) {
    transferBoardScroll(workspace, board);
  }

  expect(board.scrollTop).toBe(300);
  expect(workspace.scrollTop).toBe(99.6);
});

it('subtracts only the distance the workspace actually consumed', () => {
  const workspace = document.createElement('div');
  const board = document.createElement('div');
  let position = 50;
  Object.defineProperties(workspace, {
    scrollHeight: { value: 600 },
    clientHeight: { value: 500 },
    scrollTop: {
      get: () => position,
      set: (value: number) => {
        position = Math.min(99.5, value);
      },
    },
  });
  board.scrollTop = 300;

  transferBoardScroll(workspace, board);
  transferBoardScroll(workspace, board);

  expect(position).toBe(99.5);
  expect(board.scrollTop).toBe(250.5);
});
