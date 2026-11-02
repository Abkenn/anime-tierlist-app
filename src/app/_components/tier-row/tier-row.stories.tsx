import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { TierRow } from './tier-row';

const meta = {
  title: 'Tierlist/TierRow',
  component: TierRow,
  args: { rank: 'S' },
  decorators: [
    (Story) => (
      <ol className="border border-ink bg-charcoal">
        <Story />
      </ol>
    ),
  ],
} satisfies Meta<typeof TierRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Top: Story = { args: { rank: 'S+' } };
export const Dropped: Story = { args: { rank: 'Dropped' } };
export const Watching: Story = {
  args: { rank: 'Watching' },
};
