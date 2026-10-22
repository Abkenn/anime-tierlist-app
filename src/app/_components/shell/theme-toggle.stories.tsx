import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, waitFor } from 'storybook/test';
import { ThemeToggle } from './theme-toggle';

const meta = {
  title: 'Shell/ThemeToggle',
  component: ThemeToggle,
} satisfies Meta<typeof ThemeToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas, userEvent }) => {
    await waitFor(() => expect(document.documentElement).toHaveClass('dark'));
    await userEvent.click(
      canvas.getByRole('button', { name: 'Toggle light and dark theme' }),
    );
    await waitFor(() =>
      expect(document.documentElement).not.toHaveClass('dark'),
    );
    await userEvent.click(
      canvas.getByRole('button', { name: 'Toggle light and dark theme' }),
    );
    await waitFor(() => expect(document.documentElement).toHaveClass('dark'));
  },
};
