import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { mocked } from 'storybook/test';
import { TierBoardProvider } from '@/app/_providers/tier-board-provider';
import { markOffline } from '@/app/_services/offline-mode';
import { OfflineFallback } from './offline-fallback';

const meta = {
  title: 'Offline/OfflineFallback',
  component: OfflineFallback,
  decorators: [
    (Story) => (
      <TierBoardProvider>
        <Story />
      </TierBoardProvider>
    ),
  ],
  beforeEach: () => {
    mocked(markOffline).mockImplementation(() => {});
  },
} satisfies Meta<typeof OfflineFallback>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
