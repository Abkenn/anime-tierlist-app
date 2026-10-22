import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useCallback, useRef, useState } from 'react';
import { expect, waitFor } from 'storybook/test';
import { TierViewport } from './tier-viewport';

const ViewportSandbox = () => {
  const viewportRef = useRef<HTMLElement>(null);

  return (
    <div className="w-full max-w-86">
      <TierViewport ref={viewportRef} scrollable>
        <div className="h-240 w-120 bg-charcoal p-4 text-cloud">
          Scroll horizontally or vertically
        </div>
      </TierViewport>
    </div>
  );
};

const RefCleanupSandbox = ({ scrollable }: { scrollable: boolean }) => {
  const [visible, setVisible] = useState(true);
  const [cleanupCount, setCleanupCount] = useState(0);
  const [elementName, setElementName] = useState('');

  const viewportRef = useCallback((element: HTMLElement | null) => {
    if (!element) {
      return;
    }

    setElementName(element.tagName);

    return () => setCleanupCount((count) => count + 1);
  }, []);

  return (
    <div>
      <button
        type="button"
        className="min-h-11"
        onClick={() => setVisible(false)}
      >
        Unmount viewport
      </button>

      <output aria-label="Viewport element">{elementName}</output>

      <output aria-label="Ref cleanup count">{cleanupCount}</output>

      {visible && (
        <TierViewport ref={viewportRef} scrollable={scrollable}>
          <div className="h-240 w-120">Scrollable content</div>
        </TierViewport>
      )}
    </div>
  );
};

const meta = {
  title: 'Tierlist/TierViewport',
  component: ViewportSandbox,
} satisfies Meta<typeof ViewportSandbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {};

export const RefCleanup: Story = {
  render: () => <RefCleanupSandbox scrollable />,
  play: async ({ canvas, userEvent }) => {
    await waitFor(() =>
      expect(canvas.getByLabelText('Viewport element')).toHaveTextContent(
        'SECTION',
      ),
    );
    const before = Number(
      canvas.getByLabelText('Ref cleanup count').textContent,
    );

    await userEvent.click(
      canvas.getByRole('button', { name: 'Unmount viewport' }),
    );
    await waitFor(() =>
      expect(canvas.getByLabelText('Ref cleanup count')).toHaveTextContent(
        String(before + 1),
      ),
    );
  },
};

export const InlineRefCleanup: Story = {
  ...RefCleanup,
  render: () => <RefCleanupSandbox scrollable={false} />,
};
