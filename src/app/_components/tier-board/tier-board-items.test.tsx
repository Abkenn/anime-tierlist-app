import { render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { expect, it, vi } from 'vitest';
import { TierBoardProvider } from '@/app/_providers/tier-board-provider';
import { TierBoardItems } from './tier-board-items';
import { TierBoardOverview } from './tier-board-overview';

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
  TierItemPassive: ({ id }: { id: string }) => <button type="button" data-testid={id} />,
}));

const fixture = (count: number): ComponentProps<typeof TierBoardItems>['interaction'] => ({
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
  const interaction = fixture(32);
  const board = (input: typeof interaction) => (
    <TierBoardProvider>
      <TierBoardItems interaction={input} />
    </TierBoardProvider>
  );
  const result = render(board(interaction));
  const first = screen.getByTestId('poster-0');
  const last = screen.getByTestId('poster-31');
  expect(screen.getAllByRole('button')).toHaveLength(32);

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
  expect(screen.getByTestId('poster-31')).toBe(last);
  expect(screen.getAllByRole('button')).toHaveLength(32);
  viewport.top = 0;
  viewport.bottom = 500;
});

it('shows a non-draggable compact overview and restores editing controls at an explicit size', () => {
  const interaction = fixture(3);
  const board = (compactAuto: boolean) => (
    <TierBoardProvider>
      {compactAuto ? (
        <TierBoardOverview interaction={interaction} />
      ) : (
        <TierBoardItems interaction={interaction} />
      )}
    </TierBoardProvider>
  );
  const result = render(board(true));
  expect(screen.queryAllByRole('button')).toHaveLength(0);
  expect(screen.getByText('Poster 0')).toBeInTheDocument();
  result.rerender(board(false));
  expect(screen.getAllByRole('button')).toHaveLength(3);
});

it.each([56, 5000])(
  'keeps culled poster geometry without mounting controls on a %i-item board',
  (count) => {
    const interaction = fixture(count);
    const board = () => (
      <TierBoardProvider>
        <TierBoardItems interaction={interaction} />
      </TierBoardProvider>
    );
    const result = render(board());
    expect(screen.getByTestId('poster-0')).toBeInTheDocument();
    expect(screen.queryByTestId(`poster-${count - 1}`)).not.toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(6);
    const path = result.container.querySelector('[data-placeholder-rank="A"]');
    expect(path).toHaveAttribute('d', expect.stringContaining('M0,600h60v100h-60Z'));
    expect(path).not.toHaveAttribute('d', expect.stringContaining('M0,0h60v100h-60Z'));
    expect(result.container.querySelectorAll('[data-placeholder-rank]')).toHaveLength(1);

    viewport.top = 4000;
    viewport.bottom = 4500;
    result.rerender(board());
    expect(screen.queryByTestId('poster-0')).not.toBeInTheDocument();
    expect(screen.getByTestId('poster-40')).toBeInTheDocument();
    expect(path).toHaveAttribute('d', expect.stringContaining('M0,0h60v100h-60Z'));
    expect(path).not.toHaveAttribute('d', expect.stringContaining('M0,4000h60v100h-60Z'));
    viewport.top = 0;
    viewport.bottom = 500;
  },
);
