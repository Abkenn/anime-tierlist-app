import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { TierRow } from './tier-row';

const meta = {
  title: 'Tierlist/TierRow',
  component: TierRow,
  args: { rank: 'S', color: 'rose' },
  argTypes: {
    color: {
      control: 'select',
      options: [
        'orchid',
        'rose',
        'salmon',
        'apricot',
        'gold',
        'yellow',
        'citron',
        'chartreuse',
        'lime',
        'leaf',
        'mint',
        'jade',
        'seafoam',
        'aqua',
        'sky',
        'azure',
        'periwinkle',
        'lavender',
        'wisteria',
        'stone',
      ],
    },
  },
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
export const Top: Story = { args: { rank: 'S+', color: 'orchid' } };
export const Dropped: Story = { args: { rank: 'Dropped', color: 'wisteria' } };
export const Watching: Story = {
  args: { rank: 'Watching', color: 'stone' },
};
