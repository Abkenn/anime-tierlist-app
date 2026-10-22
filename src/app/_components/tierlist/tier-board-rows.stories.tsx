import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { defaultTierRanks, tierRanks } from '@/app/_lib/tier-ranks';
import { TierBoardRows } from './tier-board-rows';
import { aspectRatioTierItems } from './tier-image.fixtures';

const meta = {
  title: 'Tierlist/TierBoardRows',
  component: TierBoardRows,
  args: {
    ranks: defaultTierRanks,
    layout: 'single-line',
    interaction: {
      items: aspectRatioTierItems,
      targetRank: null,
      visibleRank: (item) => item.rank,
      lines: () => 1,
    },
  },
  argTypes: { interaction: { control: false } },
} satisfies Meta<typeof TierBoardRows>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const AllRanks: Story = { args: { ranks: tierRanks } };
