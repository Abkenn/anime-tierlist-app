import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { type ComponentProps, useEffect, useState } from 'react';
import { useArgs } from 'storybook/preview-api';
import { expect } from 'storybook/test';
import type { TierRank } from '@/app/_types/tierlist.types';
import { TierBoard, tierRanks } from './tier-board';

type StoryArgs = NonNullable<ComponentProps<typeof TierBoard>> &
  Partial<Record<TierRank, boolean>>;

const RankSandbox = ({
  ranks = [],
  onRanksChange,
  ...props
}: NonNullable<ComponentProps<typeof TierBoard>>) => {
  const [currentRanks, setCurrentRanks] = useState(ranks);

  const rankKey = ranks.join(',');

  useEffect(() => {
    setCurrentRanks(rankKey ? (rankKey.split(',') as TierRank[]) : []);
  }, [rankKey]);

  return (
    <TierBoard
      {...props}
      ranks={currentRanks}
      onRanksChange={(nextRanks) => {
        setCurrentRanks(nextRanks);
        onRanksChange?.(nextRanks);
      }}
    />
  );
};

const meta = {
  title: 'Tierlist/TierBoard',
  component: TierBoard,
  args: Object.fromEntries(tierRanks.map((rank) => [rank, true])),
  argTypes: Object.fromEntries(
    tierRanks.map((rank) => [
      rank,
      { control: 'boolean', table: { category: 'Ranks' } },
    ]),
  ),
  parameters: { controls: { include: tierRanks } },
  render: (args) => {
    const [, updateArgs] = useArgs<StoryArgs>();

    return (
      <RankSandbox
        initialItemCount={args.initialItemCount}
        layout={args.layout}
        ranks={tierRanks.filter((rank) => args[rank] !== false)}
        onRanksChange={(ranks) => {
          updateArgs(
            Object.fromEntries(
              tierRanks.map((rank) => [rank, ranks.includes(rank)]),
            ),
          );
        }}
      />
    );
  },
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const ConfigureVariants: Story = {
  args: { 'S−': false },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'tier options' }));
    await userEvent.click(canvas.getByRole('checkbox', { name: 'S−' }));
    await expect(
      canvas.findByRole('listitem', { name: 'S− tier, empty' }),
    ).resolves.toBeVisible();
    await userEvent.click(canvas.getByRole('checkbox', { name: 'S+' }));
    await expect(
      canvas.queryByRole('listitem', { name: 'S+ tier, empty' }),
    ).not.toBeInTheDocument();
  },
};

export const Light: Story = { globals: { theme: 'light' } };
export const Narrow: Story = {
  decorators: [
    (Story) => (
      <div className="max-w-80">
        <Story />
      </div>
    ),
  ],
};

export const AllVariants: Story = {
  play: async ({ canvas }) => {
    const rows = canvas.getAllByRole('listitem');
    const colors = rows.map(
      (row) =>
        getComputedStyle(row.firstElementChild as HTMLElement).backgroundColor,
    );

    await expect(rows).toHaveLength(20);
    await expect(new Set(colors).size).toBe(20);
  },
};

export const KeyboardMovement: Story = {
  play: async ({ canvas, userEvent }) => {
    const item = await canvas.findByRole('button', { name: 'Item 1 in S+' });

    item.focus();
    await userEvent.keyboard('{ArrowDown}');
    await expect(
      canvas.findByRole('button', { name: 'Item 1 in S' }),
    ).resolves.toHaveFocus();
    await expect(
      canvas.getByRole('button', { name: 'Item 1 in S' }),
    ).toHaveStyle({ outlineStyle: 'solid' });
    await userEvent.keyboard('{ArrowUp}');
    await expect(
      canvas.findByRole('button', { name: 'Item 1 in S+' }),
    ).resolves.toHaveFocus();
  },
};

export const KeyboardOrdering: Story = {
  play: async ({ canvas, userEvent }) => {
    const first = await canvas.findByRole('button', { name: 'Item 1 in S+' });
    const second = await canvas.findByRole('button', { name: 'Item 2 in S+' });

    first.focus();
    await userEvent.keyboard('{ArrowRight}');
    await expect(canvas.getByText(/Keyboard mode/)).toBeVisible();
    await expect(
      canvas.getByText('Item 1 moved to S+, position 2'),
    ).toBeInTheDocument();
    await userEvent.keyboard('{ArrowLeft}');
    await expect(
      canvas.getByText('Item 1 moved to S+, position 1'),
    ).toBeInTheDocument();
    await expect(first).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    await expect(first).not.toHaveFocus();
    await expect(canvas.getByText(/Tab to select/)).toBeVisible();
    await expect(second).toBeVisible();
  },
};

export const GamerKeys: Story = {
  play: async ({ canvas, userEvent }) => {
    const item = await canvas.findByRole('button', { name: 'Item 1 in S+' });

    item.focus();
    await userEvent.keyboard('d');
    await expect(
      canvas.getByText('Item 1 moved to S+, position 2'),
    ).toBeInTheDocument();
    await userEvent.keyboard('A');
    await expect(
      canvas.getByText('Item 1 moved to S+, position 1'),
    ).toBeInTheDocument();
    await userEvent.keyboard('s');
    await expect(
      canvas.getByRole('button', { name: 'Item 1 in S' }),
    ).toHaveFocus();
    await userEvent.keyboard('W');
    await expect(
      canvas.getByRole('button', { name: 'Item 1 in S+' }),
    ).toHaveFocus();
  },
};

export const Mobile344: Story = {
  name: 'Mobile 344 · ten items · two lines',
  args: { initialItemCount: 10, layout: 'two-line' },
  parameters: {
    layout: 'fullscreen',
    viewport: {
      options: {
        fold344: {
          name: 'Fold 344',
          styles: { width: '344px', height: '896px' },
        },
      },
    },
  },
  globals: { viewport: { value: 'fold344', isRotated: false } },
  decorators: [
    (Story) => (
      <div className="w-full max-w-86">
        <Story />
      </div>
    ),
  ],
  play: async ({ canvas }) => {
    await expect(
      canvas.findByRole('button', { name: 'Item 10 in S+' }),
    ).resolves.toBeVisible();
    await expect(
      canvas.getAllByRole('button', { name: /^Item / }),
    ).toHaveLength(10);
  },
};
