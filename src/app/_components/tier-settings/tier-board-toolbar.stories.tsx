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
    settingsOpen: false,
    optionsId: 'toolbar-rank-options',
    imageMode: 'contain',
    onToggleOptions: fn(),
    onImageModeChange: fn(),
  },
  render: (args) => {
    const [, updateArgs] = useArgs();

    return (
      <>
        <TierBoardToolbar
          {...args}
          onToggleOptions={() =>
            updateArgs({ settingsOpen: !args.settingsOpen })
          }
          onImageModeChange={(imageMode) => updateArgs({ imageMode })}
        />

        <div id={args.optionsId} hidden />
      </>
    );
  },
} satisfies Meta<typeof TierBoardToolbar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const KeyboardMode: Story = { args: { keyboardMode: true } };
