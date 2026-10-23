import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useArgs } from 'storybook/preview-api';
import { TerminalText } from './terminal-text';

const meta = {
  title: 'Shell/TerminalText',
  component: TerminalText,
  args: { text: 'Searching...' },
  render: (args) => {
    const [, updateArgs] = useArgs();

    return (
      <div className="space-y-4 text-xs text-muted-foreground">
        <p role="status">
          <TerminalText {...args} />
        </p>

        <div className="flex gap-4">
          <button
            type="button"
            className="min-h-10 underline underline-offset-4"
            onClick={() => updateArgs({ text: 'Searching...' })}
          >
            Search
          </button>

          <button
            type="button"
            className="min-h-10 underline underline-offset-4"
            onClick={() => updateArgs({ text: 'No images found.' })}
          >
            Finish
          </button>
        </div>
      </div>
    );
  },
} satisfies Meta<typeof TerminalText>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Pending: Story = {};
export const EmptyMessage: Story = { args: { text: 'No images found.' } };
export const ErrorMessage: Story = {
  args: { text: 'Image could not be loaded. Try another image.' },
};
