import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { aspectRatioTierItems } from './tier-image.fixtures';
import { TierItemImage } from './tier-item-image';

const meta = {
  title: 'Tierlist/TierItemImage',
  component: TierItemImage,
  args: {
    image: aspectRatioTierItems[0].image,
    mode: 'contain',
    crop: { x: 0.5, y: 0.5 },
  },
  decorators: [
    (Story) => (
      <div className="relative size-24 overflow-hidden bg-charcoal">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TierItemImage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Portrait: Story = {};
export const Landscape: Story = {
  args: { image: aspectRatioTierItems[1].image },
};
export const Fill: Story = { args: { mode: 'cover' } };

export const Square: Story = { args: { image: aspectRatioTierItems[2].image } };
