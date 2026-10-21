import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { TierRow } from './tier-row';

const meta = {
  title: 'Tierlist/TierRow',
  component: TierRow,
  args: { rank: 'S', color: 'S' },
  argTypes: {
    color: {
      control: 'select',
      options: [
        'S+',
        'S',
        'S−',
        'A+',
        'A',
        'A−',
        'B+',
        'B',
        'B−',
        'C+',
        'C',
        'C−',
        'D+',
        'D',
        'D−',
        'F+',
        'F',
        'F−',
        'Dropped',
        'Watching',
      ],
    },
  },
  decorators: [
    (Story) => (
      <ol className="border border-[#111] bg-[#1c1c1c]">
        <Story />
      </ol>
    ),
  ],
} satisfies Meta<typeof TierRow>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Top: Story = { args: { rank: 'S+', color: 'S+' } };
export const Dropped: Story = { args: { rank: 'Dropped', color: 'Dropped' } };
export const Watching: Story = {
  args: { rank: 'Watching', color: 'Watching' },
};
