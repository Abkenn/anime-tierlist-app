import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { PreviewLink } from './preview-link';

const meta = {
  title: 'Home/PreviewLink',
  component: PreviewLink,
  args: { expanded: false },
  decorators: [
    (Story) => (
      <div>
        <Story />
        <div id="tier-preview" />
      </div>
    ),
  ],
} satisfies Meta<typeof PreviewLink>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Collapsed: Story = {};
export const Expanded: Story = { args: { expanded: true } };
