import { render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { expect, it, vi } from 'vitest';
import { TierBoardProvider } from '@/app/_providers/tier-board-provider';
import { TierBoardItems } from './tier-board-items';

const viewport = vi.hoisted(() => ({
  left: 0,
  right: 500,
  top: 0,
  bottom: 500,
  visible: { left: 0, right: 500, top: 0, bottom: 500 },
}));

vi.mock('@/app/_hooks/use-viewport-window', () => ({
  useViewportWindow: () => viewport,
}));

vi.mock('@/app/_components/tier-item/tier-item-passive', () => ({
  TierItemPassive: ({ id }: { id: string }) => (
    <button type="button" data-testid={id} />
  ),
}));

const fixture = (
  count: number,
): ComponentProps<typeof TierBoardItems>['interaction'] => ({
  boardRef: { current: null },
  items: Array.from({ length: count }, (_, index) => ({
    id: `poster-${index}`,
    label: `Poster ${index}`,
    rank: 'A',
  })),
  posterLayout: Array.from({ length: count }, (_, index) => ({
    id: `poster-${index}`,
    x: 0,
    y: index * 100,
    width: 60,
    height: 100,
  })),
  draggingId: null,
  dropPosition: null,
  position: () => ({ x: '0rem', y: '0rem', width: '4rem', height: '6rem' }),
  visibleRank: (item) => item.rank,
  announcement: '',
  updateItem: vi.fn(),
  start: vi.fn(),
  move: vi.fn(),
  drop: vi.fn(),
  cancel: vi.fn(),
  keyboardMove: vi.fn(),
});

it('retains every small-board poster across viewport and geometry changes', () => {
  const interaction = fixture(56);
  const board = (input: typeof interaction) => (
    <TierBoardProvider>
      <TierBoardItems interaction={input} />
    </TierBoardProvider>
  );
  const result = render(board(interaction));
  const first = screen.getByTestId('poster-0');
  const last = screen.getByTestId('poster-55');
  expect(screen.getAllByRole('button')).toHaveLength(56);

  viewport.top = 4000;
  viewport.bottom = 4500;
  result.rerender(
    board({
      ...interaction,
      posterLayout: interaction.posterLayout.map((poster) => ({
        ...poster,
        y: poster.y * 2,
        height: 200,
      })),
    }),
  );
  expect(screen.getByTestId('poster-0')).toBe(first);
  expect(screen.getByTestId('poster-55')).toBe(last);
  expect(screen.getAllByRole('button')).toHaveLength(56);
  viewport.top = 0;
  viewport.bottom = 500;
});

it('keeps skeleton geometry for every culled poster without mounting its controls', () => {
  const interaction = fixture(5000);
  const board = () => (
    <TierBoardProvider>
      <TierBoardItems interaction={interaction} />
    </TierBoardProvider>
  );
  const result = render(board());
  expect(screen.getByTestId('poster-0')).toBeInTheDocument();
  expect(screen.queryByTestId('poster-4999')).not.toBeInTheDocument();
  expect(screen.getAllByRole('button')).toHaveLength(6);
  const path = result.container.querySelector('[data-placeholder-rank="A"]');
  expect(path).toHaveAttribute(
    'd',
    expect.stringContaining('M0,600h60v100h-60Z'),
  );
  expect(path).not.toHaveAttribute(
    'd',
    expect.stringContaining('M0,0h60v100h-60Z'),
  );
  expect(
    result.container.querySelectorAll('[data-placeholder-rank]'),
  ).toHaveLength(1);

  viewport.top = 4000;
  viewport.bottom = 4500;
  result.rerender(board());
  expect(screen.queryByTestId('poster-0')).not.toBeInTheDocument();
  expect(screen.getByTestId('poster-40')).toBeInTheDocument();
  expect(path).toHaveAttribute(
    'd',
    expect.stringContaining('M0,0h60v100h-60Z'),
  );
  expect(path).not.toHaveAttribute(
    'd',
    expect.stringContaining('M0,4000h60v100h-60Z'),
  );
  viewport.top = 0;
  viewport.bottom = 500;
});
