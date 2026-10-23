import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, waitFor } from 'storybook/test';
import { TierItemImage } from './tier-item-image';
import { TierItemTitle } from './tier-item-title';

const image = {
  src: '/tier-samples/portrait.svg',
  width: 900,
  height: 1600,
  alt: 'Portrait sample',
};
const meta = {
  title: 'Tierlist/TierItemTitle',
  component: TierItemTitle,
  args: {
    image,
    mode: 'natural',
    title: {
      text: 'Heavenly\nDelusion',
      wrap: false,
      position: 'top',
      color: '#ffffff',
    },
  },
  render: (args) => (
    <div className="relative h-40 w-24">
      <TierItemImage
        image={args.image ?? image}
        mode={args.mode}
        crop={{ x: 0.5, y: 0.5 }}
      />

      <TierItemTitle {...args} />
    </div>
  ),
} satisfies Meta<typeof TierItemTitle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Top: Story = {};
export const Middle: Story = {
  args: {
    title: {
      text: '推しの子\nЗаглавие',
      wrap: false,
      position: 'middle',
      color: '#ffffff',
    },
  },
};
export const WrappedBottom: Story = {
  args: {
    title: {
      text: 'Ascendance of a Bookworm',
      wrap: true,
      position: 'bottom',
      color: '#ffe599',
    },
  },
};

export const FourLines: Story = {
  args: {
    image: {
      src: '/tier-samples/landscape.svg',
      width: 1600,
      height: 900,
      alt: 'Landscape sample',
    },
    mode: 'contain',
    title: {
      text: 'One\nTwo\nThree\nFour',
      wrap: false,
      position: 'bottom',
      color: '#ffffff',
    },
  },
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      const title = canvasElement.querySelector(
        '[data-tier-title] > span > span',
      );
      const bounds = title?.getBoundingClientRect();
      const frame = title?.parentElement?.getBoundingClientRect();

      expect(
        frame?.width && frame?.height ? frame.width / frame.height : 0,
      ).toBeCloseTo(16 / 9);
      expect(
        bounds && frame ? bounds.top - frame.top : 0,
      ).toBeGreaterThanOrEqual(3.5);
      expect(
        bounds && frame ? frame.bottom - bounds.bottom : 0,
      ).toBeGreaterThanOrEqual(3.5);
    });
  },
};
