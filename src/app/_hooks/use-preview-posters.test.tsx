import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { layoutExportBoard } from '@/app/_lib/tierlist-export-layout';
import { usePreviewPosters } from './use-preview-posters';

afterEach(() => vi.unstubAllGlobals());

it('keeps posters inside the panned pinch-zoom viewport and updates on visual viewport changes', async () => {
  const viewport = Object.assign(new EventTarget(), {
    offsetLeft: 600,
    offsetTop: 0,
    width: 200,
    height: 300,
  });
  vi.stubGlobal('visualViewport', viewport);
  vi.stubGlobal('innerWidth', 400);
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
  const element = document.createElement('div');
  element.getBoundingClientRect = () => new DOMRect(0, 0, 1000, 1000);
  const root = { current: element };
  const board = layoutExportBoard({
    version: 1,
    imageMode: 'cover',
    ranks: ['S'],
    items: Array.from({ length: 8 }, (_, index) => ({
      id: String(index),
      label: String(index),
      rank: 'S',
    })),
  });
  const posters = board.rows.flatMap((row) => row.posters);
  const { result } = renderHook(() =>
    usePreviewPosters(root, posters, 1000, 1000),
  );
  expect(result.current.some((poster) => poster.item.id === '3')).toBe(true);
  expect(result.current.some((poster) => poster.item.id === '0')).toBe(false);
  act(() => {
    viewport.offsetLeft = 0;
    viewport.dispatchEvent(new Event('resize'));
  });
  await waitFor(() => {
    expect(result.current.some((poster) => poster.item.id === '0')).toBe(true);
    expect(result.current.some((poster) => poster.item.id === '3')).toBe(false);
  });
});
