import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { HomeShell } from './home-shell';

const meta = {
  title: 'Home/HomeShell',
  component: HomeShell,
  args: { children: 'Your tierlist goes here.' },
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof HomeShell>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
