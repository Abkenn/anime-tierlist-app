import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ComponentProps } from 'react';
import { expect, fireEvent, fn, within } from 'storybook/test';
import { useTierImageMode } from '@/app/_hooks/use-tier-image-mode';
import { TierBoardProvider } from '@/app/_providers/tier-board-provider';
import type { TierImageMode } from '@/app/_types/tierlist.types';
import { TierItemMenu } from './tier-item-menu';
import { TierItemSizing } from './tier-item-sizing';

type StoryArgs = ComponentProps<typeof TierItemMenu> & {
  imageMode: TierImageMode;
};

const Sandbox = ({ imageMode, ...props }: StoryArgs) => {
  useTierImageMode({ value: imageMode });

  return <TierItemMenu {...props} />;
};

const meta = {
  title: 'Tierlist/TierItemMenu',
  component: TierItemMenu,
  args: {
    trigger: (
      <button type="button" className="min-h-11 border border-divider px-4">
        Right click for image options
      </button>
    ),
    imageMode: 'cover',
    hasImage: true,
    editing: false,
    onOpen: fn(),
    onEdit: fn(),
    onReset: fn(),
    sizingControl: (
      <TierItemSizing
        image={{
          src: '/storybook/tier-landscape.svg',
          width: 16,
          height: 9,
          alt: 'Landscape poster',
        }}
        expansion={0}
        onChange={fn()}
      />
    ),
  },
  render: (args) => (
    <TierBoardProvider>
      <Sandbox {...args} />
    </TierBoardProvider>
  ),
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Fill: Story = {};
export const OriginalRatio: Story = { args: { imageMode: 'natural' } };

export const SquareFill: Story = {
  args: { squareImage: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    fireEvent.contextMenu(
      canvas.getByRole('button', { name: 'Right click for image options' }),
    );
    await expect(
      await page.findByRole('menuitem', { name: 'Edit crop' }),
    ).toHaveAttribute('aria-disabled', 'true');
    await expect(
      page.getByRole('menuitem', { name: 'Reset crop' }),
    ).toHaveAttribute('aria-disabled', 'true');
  },
};
