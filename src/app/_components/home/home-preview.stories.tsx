import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { HomePreview } from './home-preview';

const meta = {
  title: 'Home/HomePreview',
  component: HomePreview,
  argTypes: { searchParams: { control: false } },
} satisfies Meta<typeof HomePreview>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Collapsed: Story = { args: { searchParams: Promise.resolve({}) } };
export const Expanded: Story = {
  args: { searchParams: Promise.resolve({ preview: 'tiers' }) },
};
