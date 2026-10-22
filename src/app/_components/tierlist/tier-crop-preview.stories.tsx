import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { TierCropPreview } from './tier-crop-preview';

const meta = {
  title: 'Tierlist/TierCropPreview',
  component: TierCropPreview,
  args: {
    image: {
      src: '/storybook/tier-landscape.svg',
      width: 1600,
      height: 900,
      alt: 'Landscape poster',
    },
    crop: { x: 0.5, y: 0.5 },
  },
  decorators: [
    (Story) => (
      <div className="p-20">
        <div className="relative size-16 ring-2 ring-white">
          <Story />
        </div>
      </div>
    ),
  ],
} satisfies Meta<typeof TierCropPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Landscape: Story = {};
export const Portrait: Story = {
  args: {
    image: {
      src: '/storybook/tier-portrait.svg',
      width: 900,
      height: 1600,
      alt: 'Portrait poster',
    },
  },
};
