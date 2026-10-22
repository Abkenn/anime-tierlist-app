import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { type ComponentProps, useEffect, useState } from 'react';
import { expect, fn } from 'storybook/test';
import { defaultTierRanks, tierRanks } from '@/app/_lib/tier-ranks';
import { TierRankOptions } from './tier-rank-options';

const Sandbox = ({
  enabledRanks,
  onToggle,
  ...props
}: ComponentProps<typeof TierRankOptions>) => {
  const [currentRanks, setCurrentRanks] = useState(enabledRanks);

  const toggle = (rank: (typeof enabledRanks)[number]) => {
    setCurrentRanks((current) =>
      current.includes(rank)
        ? current.filter((value) => value !== rank)
        : [...current, rank],
    );
    onToggle(rank);
  };

  useEffect(() => {
    setCurrentRanks(enabledRanks);
  }, [enabledRanks]);

  return (
    <TierRankOptions {...props} enabledRanks={currentRanks} onToggle={toggle} />
  );
};

const meta = {
  title: 'Tierlist/TierRankOptions',
  component: TierRankOptions,
  args: {
    id: 'rank-options',
    open: true,
    enabledRanks: defaultTierRanks,
    onToggle: fn(),
  },
  render: (args) => <Sandbox {...args} />,
} satisfies Meta<typeof TierRankOptions>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas, userEvent }) => {
    const variant = canvas.getByRole('checkbox', { name: 'S−' });

    await expect(variant).not.toBeChecked();
    await userEvent.click(variant);
    await expect(variant).toBeChecked();
  },
};
export const AllVariants: Story = { args: { enabledRanks: tierRanks } };
