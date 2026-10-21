import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { type ComponentProps, useEffect, useState } from 'react';
import { useArgs } from 'storybook/preview-api';
import { expect } from 'storybook/test';
import { TierBoard, tierRanks } from './tier-board';
import type { TierColor } from './tier-row';

type StoryArgs = NonNullable<ComponentProps<typeof TierBoard>> &
  Partial<Record<TierColor, boolean>>;

const RankSandbox = ({
  ranks = [],
  onRanksChange,
}: NonNullable<ComponentProps<typeof TierBoard>>) => {
  const [currentRanks, setCurrentRanks] = useState(ranks);
  const rankKey = ranks.join(',');
  useEffect(() => {
    setCurrentRanks(rankKey ? (rankKey.split(',') as TierColor[]) : []);
  }, [rankKey]);
  return (
    <TierBoard
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
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'tier options' }));
    for (const checkbox of canvas.getAllByRole('checkbox')) {
      if (!(checkbox as HTMLInputElement).checked)
        await userEvent.click(checkbox);
    }
    const rows = canvas.getAllByRole('listitem');
    const colors = rows.map(
      (row) =>
        getComputedStyle(row.firstElementChild as HTMLElement).backgroundColor,
    );
    await expect(rows).toHaveLength(20);
    await expect(new Set(colors).size).toBe(20);
  },
};
