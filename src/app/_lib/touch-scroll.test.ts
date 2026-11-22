import { expect, it } from 'vitest';
import { getTouchScrollState } from './touch-scroll';

it('scrolls the single mobile workspace while the board has no independent scroll range', () => {
  const workspace = document.createElement('div');
  workspace.dataset.tierWorkspaceScroll = '';
  const board = document.createElement('section');
  board.dataset.tierViewport = '';
  workspace.append(board);
  Object.defineProperties(workspace, {
    scrollHeight: { value: 3000 },
    clientHeight: { value: 600 },
  });
  Object.defineProperties(board, { scrollHeight: { value: 2800 }, clientHeight: { value: 2800 } });
  const state = getTouchScrollState(board);
  expect(state.max).toBe(2400);
  state.moveTo(1000);
  expect(workspace.scrollTop).toBe(1000);
  expect(board.scrollTop).toBe(0);
  state.moveTo(9999);
  expect(workspace.scrollTop).toBe(2400);
});

it('keeps desktop board scrolling inside the board viewport', () => {
  const board = document.createElement('section');
  board.dataset.tierViewport = '';
  Object.defineProperties(board, { scrollHeight: { value: 1800 }, clientHeight: { value: 600 } });
  const state = getTouchScrollState(board);
  state.moveTo(300);
  expect(state.max).toBe(1200);
  expect(board.scrollTop).toBe(300);
});
