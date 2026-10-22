import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ComponentProps } from 'react';
import { fn } from 'storybook/test';
import { TierBoardSettingsContext } from '@/app/_providers/tier-board-context';
import type { TierImageMode } from '@/app/_types/tierlist.types';
import { TierItemMenu } from './tier-item-menu';
import { TierItemSizing } from './tier-item-sizing';

type StoryArgs = ComponentProps<typeof TierItemMenu> & {
  imageMode: TierImageMode;
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
  render: ({ imageMode, ...args }) => (
    <TierBoardSettingsContext value={imageMode}>
      <TierItemMenu {...args} />
    </TierBoardSettingsContext>
  ),
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Fill: Story = {};
export const OriginalRatio: Story = { args: { imageMode: 'natural' } };
