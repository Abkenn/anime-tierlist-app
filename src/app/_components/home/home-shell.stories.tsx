import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { TierBoard, tierRanks } from '@/app/_components/tierlist/tier-board';
import { HomeShell } from './home-shell';

const meta = {
  title: 'Home/HomeShell',
  component: HomeShell,
  args: { children: <TierBoard /> },
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof HomeShell>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const AllRanks: Story = {
  args: { children: <TierBoard ranks={tierRanks} /> },
};
