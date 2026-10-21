import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { HomeMode } from './home-mode';

const meta = {
  title: 'Home/HomeMode',
  component: HomeMode,
  args: { children: 'Online homepage content' },
} satisfies Meta<typeof HomeMode>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Online: Story = {};
export const Offline: Story = {
  parameters: { nextjs: { navigation: { query: { offline: 'dev' } } } },
};
