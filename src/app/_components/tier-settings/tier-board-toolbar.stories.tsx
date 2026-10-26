import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useArgs } from 'storybook/preview-api';
import { fn } from 'storybook/test';
import { TierBoardToolbar } from './tier-board-toolbar';

const meta = {
  title: 'Tierlist/TierBoardToolbar',
  component: TierBoardToolbar,
  args: {
    rankCount: 11,
    itemCount: 24,
    keyboardMode: false,
    imageMode: 'contain',
    onImageModeChange: fn(),
  },
  render: (args) => {
    const [, updateArgs] = useArgs();

    return (
      <TierBoardToolbar
        {...args}
        onImageModeChange={(imageMode) => updateArgs({ imageMode })}
      />
    );
  },
} satisfies Meta<typeof TierBoardToolbar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const KeyboardMode: Story = { args: { keyboardMode: true } };
