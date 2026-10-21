import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { HomeLink } from './home-link';

const meta = { title: 'Shell/HomeLink', component: HomeLink } satisfies Meta<
  typeof HomeLink
>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Online: Story = {};
export const Offline: Story = {
  parameters: { nextjs: { navigation: { query: { offline: 'dev' } } } },
};
