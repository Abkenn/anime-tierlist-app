import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useRef } from 'react';
import { expect, fn, waitFor, within } from 'storybook/test';
import { TierCropControls } from './tier-crop-controls';

const Sandbox = (
  props: Omit<React.ComponentProps<typeof TierCropControls>, 'anchor'>,
) => {
  const anchor = useRef<HTMLButtonElement>(null);

  return (
    <div className="p-4">
      <button
        ref={anchor}
        type="button"
        className="size-16 border border-foreground bg-gray"
      >
        1
      </button>

      <TierCropControls {...props} anchor={anchor} />
    </div>
  );
};

const meta = {
  title: 'Tierlist/TierCropControls',
  component: Sandbox,
  args: { label: '1', onSave: fn(), onCancel: fn(), onReset: fn() },
} satisfies Meta<typeof Sandbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const anchor = within(canvasElement).getByRole('button', { name: '1' });
    const page = within(canvasElement.ownerDocument.body);
    const controls = await page.findByRole('group', {
      name: 'Crop controls for item 1',
    });

    await waitFor(() => {
      const itemBounds = anchor.getBoundingClientRect();
      const controlsBounds = controls.getBoundingClientRect();
      const rem = Number.parseFloat(
        getComputedStyle(canvasElement.ownerDocument.documentElement).fontSize,
      );

      expect(controlsBounds.top - itemBounds.bottom).toBeCloseTo(rem * 0.5, 0);
      expect(controlsBounds.left).toBeGreaterThanOrEqual(0);
      expect(controlsBounds.right).toBeLessThanOrEqual(
        canvasElement.ownerDocument.documentElement.clientWidth,
      );
    });
  },
};
