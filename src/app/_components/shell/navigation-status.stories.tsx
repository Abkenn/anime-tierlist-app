import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { NavigationStatus } from './navigation-status';

const meta = {
  title: 'Shell/NavigationStatus',
  component: NavigationStatus,
} satisfies Meta<typeof NavigationStatus>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Idle: Story = {};
