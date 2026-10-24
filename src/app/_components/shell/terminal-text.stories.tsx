import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useArgs } from 'storybook/preview-api';
import { TerminalSequence } from './terminal-sequence';
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

export const InlineAccountLink: Story = {
  render: () => (
    <TerminalText
      segments={[
        { id: 'message', text: 'Changes saved in ' },
        {
          id: 'account',
          text: 'Alex (Google)',
          render: (content) => (
            <button type="button" className="underline underline-offset-4">
              {content}
            </button>
          ),
        },
      ]}
    />
  ),
};

export const SequentialMessages: Story = {
  render: () => (
    <TerminalSequence
      lines={[
        'You’re in offline mode',
        'Your tierlist still works on this device.',
        'Retry connection',
      ]}
    >
      <div className="space-y-3 text-xs">
        <p>
          <TerminalText text="You’re in offline mode" />
        </p>

        <p>
          <TerminalText
            text="Your tierlist still works on this device."
            line={1}
          />
        </p>

        <button type="button" className="underline underline-offset-4">
          <TerminalText text="Retry connection" line={2} />
        </button>
      </div>
    </TerminalSequence>
  ),
};
