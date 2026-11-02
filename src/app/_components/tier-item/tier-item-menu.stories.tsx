import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { type ComponentProps, useState } from 'react';
import { expect, fireEvent, fn, within } from 'storybook/test';
import { useTierImageMode } from '@/app/_hooks/use-tier-image-mode';
import { TierBoardProvider } from '@/app/_providers/tier-board-provider';
import type { TierImageMode } from '@/app/_types/tierlist.types';
import { TierItemMenu } from './tier-item-menu';
import { TierItemSizing } from './tier-item-sizing';

type StoryArgs = ComponentProps<typeof TierItemMenu> & {
  imageMode: TierImageMode;
};

const Sandbox = ({ imageMode, ...props }: StoryArgs) => {
  const [label, setLabel] = useState(props.label);

  useTierImageMode({ value: imageMode });

  return (
    <TierItemMenu
      {...props}
      label={label}
      onLabelChange={(next) => {
        setLabel(next);
        props.onLabelChange?.(next);
      }}
    />
  );
};

const meta = {
  title: 'Tierlist/TierItemMenu',
  component: TierItemMenu,
  args: {
    trigger: (
      <button type="button" className="min-h-11 border border-divider px-4">
        Right click for image options
      </button>
    ),
    imageMode: 'cover',
    itemId: 'poster',
    label: 'Mushoku Tensei: Jobless Reincarnation',
    onLabelChange: fn(),
    hasImage: true,
    editing: false,
    onOpen: fn(),
    onEdit: fn(),
    onReset: fn(),
    sizingControl: (
      <TierItemSizing
        image={{
          src: '/storybook/tier-landscape.svg',
          width: 16,
          height: 9,
          alt: 'Landscape poster',
        }}
        expansion={0}
        onChange={fn()}
      />
    ),
  },
  render: (args) => (
    <TierBoardProvider>
      <Sandbox {...args} />
    </TierBoardProvider>
  ),
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Fill: Story = {};
export const OriginalRatio: Story = { args: { imageMode: 'natural' } };

export const SquareFill: Story = {
  args: { squareImage: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    fireEvent.contextMenu(
      canvas.getByRole('button', { name: 'Right click for image options' }),
    );
    await expect(
      await page.findByRole('menuitem', { name: 'Edit crop' }),
    ).toHaveAttribute('aria-disabled', 'true');
    await expect(
      page.getByRole('menuitem', { name: 'Reset crop' }),
    ).toHaveAttribute('aria-disabled', 'true');
  },
};

export const InlineLabel: Story = {
  play: async ({ canvasElement, userEvent, args }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    const trigger = canvas.getByRole('button', {
      name: 'Right click for image options',
    });

    fireEvent.contextMenu(trigger);
    const label = await page.findByRole('menuitem', {
      name: `Edit label: ${args.label}`,
    });
    await expect(
      page.queryByRole('textbox', { name: 'Item label' }),
    ).not.toBeInTheDocument();
    await userEvent.click(label);
    const input = await page.findByRole('textbox', { name: 'Item label' });
    await expect(input).toHaveFocus();
    await expect(input).toHaveValue(args.label);
    await userEvent.clear(input);
    await userEvent.type(input, 'Cancelled');
    await userEvent.hover(page.getByRole('menuitem', { name: 'Edit crop' }));
    await expect(
      getComputedStyle(page.getByRole('menuitem', { name: 'Edit crop' }))
        .backgroundColor,
    ).not.toBe('rgba(0, 0, 0, 0)');
    await expect(input).toHaveFocus();
    await expect(input).toHaveValue('Cancelled');
    await expect(args.onLabelChange).not.toHaveBeenCalled();
    await userEvent.keyboard('{Escape}');
    await expect(
      await page.findByRole('menuitem', { name: `Edit label: ${args.label}` }),
    ).toBeVisible();
    await expect(args.onLabelChange).not.toHaveBeenCalled();
    await userEvent.click(
      page.getByRole('menuitem', { name: `Edit label: ${args.label}` }),
    );
    await userEvent.clear(page.getByRole('textbox', { name: 'Item label' }));
    await userEvent.type(
      page.getByRole('textbox', { name: 'Item label' }),
      'New label',
    );
    await userEvent.keyboard('{Enter}');
    await expect(
      await page.findByRole('menuitem', { name: 'Edit label: New label' }),
    ).toBeVisible();
    await expect(args.onLabelChange).toHaveBeenCalledWith('New label');
    await userEvent.click(
      page.getByRole('menuitem', { name: 'Edit label: New label' }),
    );
    await userEvent.clear(page.getByRole('textbox', { name: 'Item label' }));
    await userEvent.type(
      page.getByRole('textbox', { name: 'Item label' }),
      'Saved on dismissal',
    );
    await userEvent.click(trigger);
    await expect(args.onLabelChange).toHaveBeenCalledWith('Saved on dismissal');
  },
};

export const TouchLabel: Story = {
  args: {
    position: { x: '0rem', y: '0rem', width: '10rem', height: '10rem' },
    label:
      'A very long anime label that wraps across multiple lines without hiding the current name',
  },
  play: async ({ canvasElement, userEvent, args }) => {
    const page = within(canvasElement.ownerDocument.body);
    fireEvent.click(within(canvasElement).getByLabelText('Edit poster'));
    const label = await page.findByRole('menuitem', {
      name: `Edit label: ${args.label}`,
    });
    await expect(label.getBoundingClientRect().height).toBeGreaterThanOrEqual(
      44,
    );
    await userEvent.click(label);
    const input = await page.findByRole('textbox', { name: 'Item label' });
    await expect(getComputedStyle(input).fontSize).toBe('16px');
    await userEvent.clear(input);
    await userEvent.keyboard('{Enter}');
    await expect(
      await page.findByRole('menuitem', { name: `Edit label: ${args.label}` }),
    ).toBeVisible();
    await expect(args.onLabelChange).not.toHaveBeenCalled();
  },
};
