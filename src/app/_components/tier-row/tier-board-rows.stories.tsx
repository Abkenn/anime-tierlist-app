import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { aspectRatioTierItems } from '@/app/_components/tier-item/tier-image.fixtures';
import { defaultTierRanks, tierRanks } from '@/app/_lib/tier-ranks';
import { TierBoardRows } from './tier-board-rows';

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
      searchPosition: () => ({ left: '0.25rem', top: '50%' }),
    },
  },
  argTypes: { interaction: { control: false } },
} satisfies Meta<typeof TierBoardRows>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const AllRanks: Story = { args: { ranks: tierRanks } };
