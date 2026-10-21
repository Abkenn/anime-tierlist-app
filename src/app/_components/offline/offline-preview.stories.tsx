import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect } from 'storybook/test';
import { OfflinePreview } from './offline-preview';

const meta = {
  title: 'Offline/OfflinePreview',
  component: OfflinePreview,
} satisfies Meta<typeof OfflinePreview>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Collapsed: Story = {};
export const Expanded: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      canvas.getByRole('button', { name: /explore tiers/ }),
    );
    await expect(
      canvas.findByRole('list', { name: 'Ranked tiers' }),
    ).resolves.toBeVisible();
  },
};
