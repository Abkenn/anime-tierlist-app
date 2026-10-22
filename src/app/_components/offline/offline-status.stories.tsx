import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, mocked } from 'storybook/test';
import { useOfflineReconnect } from '@/app/_hooks/use-offline-reconnect';
import { OfflineStatus } from './offline-status';

const meta = {
  title: 'Offline/OfflineStatus',
  component: OfflineStatus,
  decorators: [
    (Story) => (
      <div className="flex min-h-64 justify-end px-16">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof OfflineStatus>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Offline: Story = {};
export const Reconnecting: Story = {
  beforeEach: () => {
    mocked(useOfflineReconnect).mockReturnValue({
      mode: 'offline',
      checking: true,
      reconnect: async () => {},
    });
  },
};
export const Online: Story = {
  beforeEach: () => {
    mocked(useOfflineReconnect).mockReturnValue({
      mode: null,
      checking: false,
      reconnect: async () => {},
    });
  },
};

export const Light: Story = { globals: { theme: 'light' } };
export const DismissAndReopen: Story = {
  play: async ({ canvas, userEvent }) => {
    await expect(
      canvas.getByRole('complementary', { name: 'Offline connection' }),
    ).toBeVisible();
    await userEvent.click(
      canvas.getByRole('button', { name: 'Dismiss offline notice' }),
    );
    await expect(canvas.queryByRole('complementary')).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: 'offline' }));
    await expect(canvas.getByRole('complementary')).toBeVisible();
  },
};
const retry = fn(async () => {});
export const Retry: Story = {
  beforeEach: () => {
    retry.mockClear();
    mocked(useOfflineReconnect).mockReturnValue({
      mode: 'offline',
      checking: false,
      reconnect: retry,
    });
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      canvas.getByRole('button', { name: 'Retry connection' }),
    );
    await expect(retry).toHaveBeenCalledOnce();
  },
};
