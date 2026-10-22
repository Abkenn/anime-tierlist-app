import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { TierItemMenu } from './tier-item-menu';

const meta = {
  title: 'Tierlist/TierItemMenu',
  component: TierItemMenu,
  args: {
    trigger: (
      <button type="button" className="min-h-11 border border-divider px-4">
        Right click for image options
      </button>
    ),
    mode: 'cover',
    hasImage: true,
    editing: false,
    rowHeightExpansion: 0,
    onOpen: fn(),
    onEdit: fn(),
    onReset: fn(),
    onRowHeightExpansion: fn(),
  },
} satisfies Meta<typeof TierItemMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Fill: Story = {};
export const OriginalRatio: Story = { args: { mode: 'natural' } };
