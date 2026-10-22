import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useRef, useState } from 'react';
import { expect, fireEvent, fn, waitFor, within } from 'storybook/test';
import { fullImageTrim } from '@/app/_lib/tier-image-trim';
import { TierImageTrimEditor } from './tier-image-trim-editor';

const Sandbox = (props: React.ComponentProps<typeof TierImageTrimEditor>) => {
  const anchor = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        ref={anchor}
        className="min-h-11 border border-divider px-3"
        onClick={() => setOpen(true)}
      >
        Edit original crop
      </button>

      {open && (
        <TierImageTrimEditor
          {...props}
          anchor={anchor}
          onSave={(trim) => {
            props.onSave(trim);
            setOpen(false);
          }}
          onCancel={() => {
            props.onCancel();
            setOpen(false);
          }}
        />
      )}
    </>
  );
};

const meta = {
  title: 'Tierlist/TierImageTrimEditor',
  component: TierImageTrimEditor,
  args: {
    anchor: { current: null },
    image: {
      src: '/tier-samples/landscape.svg',
      width: 1600,
      height: 900,
      alt: 'Landscape TEST',
    },
    trim: fullImageTrim,
    onSave: fn(),
    onCancel: fn(),
  },
  render: (args) => <Sandbox {...args} />,
} satisfies Meta<typeof TierImageTrimEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Landscape: Story = {
  play: async ({ canvasElement, userEvent, args }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    await userEvent.click(
      canvas.getByRole('button', { name: 'Edit original crop' }),
    );
    const right = await page.findByRole('slider', { name: 'right crop edge' });
    fireEvent.keyDown(right, { code: 'KeyA', shiftKey: true });
    await expect(right).toHaveAttribute('aria-valuenow', '90');
    await userEvent.hover(right);
    await expect(getComputedStyle(right).stroke).toBe('none');
    const rightBorder = page
      .getByRole('dialog')
      .querySelector('[data-crop-border="right"]');
    await expect(rightBorder).toHaveClass(/opacity-100/);
    const corner = page.getByRole('button', { name: 'top right crop corner' });
    fireEvent.keyDown(corner, { code: 'KeyS', shiftKey: true });
    fireEvent.keyDown(corner, { code: 'KeyA', shiftKey: true });
    await expect(
      page.getByRole('slider', { name: 'top crop edge' }),
    ).toHaveAttribute('aria-valuenow', '10');
    await expect(right).toHaveAttribute('aria-valuenow', '80');
    await userEvent.click(page.getByRole('button', { name: 'Done' }));
    await expect(args.onSave).toHaveBeenCalledWith({
      ...fullImageTrim,
      top: 0.1,
      right: 0.8,
    });
    await waitFor(() =>
      expect(
        page.queryByRole('dialog', { name: 'Edit custom ratio crop' }),
      ).not.toBeInTheDocument(),
    );
    await userEvent.click(
      canvas.getByRole('button', { name: 'Edit original crop' }),
    );
    const left = await page.findByRole('slider', { name: 'left crop edge' });
    fireEvent.keyDown(left, { code: 'KeyD', shiftKey: true });
    await userEvent.click(page.getByRole('button', { name: 'Cancel' }));
    await expect(args.onCancel).toHaveBeenCalled();
  },
};

export const Portrait: Story = {
  args: {
    image: {
      src: '/tier-samples/portrait.svg',
      width: 900,
      height: 1600,
      alt: 'Portrait TEST',
    },
  },
};
