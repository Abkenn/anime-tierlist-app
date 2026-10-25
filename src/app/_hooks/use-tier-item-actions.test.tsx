import { renderHook } from '@testing-library/react';
import { Provider } from 'jotai';
import { expect, it, vi } from 'vitest';
import type { TierItemActions } from '@/app/_lib/tier-item-actions-context';
import { useTierItemActions } from './use-tier-item-actions';

it('keeps the command context stable while forwarding to the latest board render', () => {
  const first = {
    boardRef: { current: null },
    updateItem: vi.fn(),
    start: vi.fn(),
    move: vi.fn(),
    drop: vi.fn(() => null),
    cancel: vi.fn(),
    keyboardMove: vi.fn(),
  } satisfies TierItemActions;
  const second = { ...first, move: vi.fn(), drop: vi.fn(() => null) };
  const { result, rerender } = renderHook(useTierItemActions, {
    initialProps: first,
    wrapper: Provider,
  });
  const commands = result.current;

  rerender(second);
  expect(result.current).toBe(commands);
  commands.move('poster', 50, 75);
  commands.drop('poster', 50, 75);
  expect(first.move).not.toHaveBeenCalled();
  expect(first.drop).not.toHaveBeenCalled();
  expect(second.move).toHaveBeenCalledWith('poster', 50, 75);
  expect(second.drop).toHaveBeenCalledWith('poster', 50, 75);
});
