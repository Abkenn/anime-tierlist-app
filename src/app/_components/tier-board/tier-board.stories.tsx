import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { type ComponentProps, useEffect, useState } from 'react';
import { useArgs } from 'storybook/preview-api';
import { expect, fireEvent, waitFor, within } from 'storybook/test';
import { aspectRatioTierItems } from '@/app/_components/tier-item/tier-image.fixtures';
import { tierRanks } from '@/app/_lib/tier-ranks';
import { TierBoardProvider } from '@/app/_providers/tier-board-provider';
import type { TierImageMode, TierRank } from '@/app/_types/tierlist.types';
import { TierBoard } from './tier-board';

type StoryArgs = NonNullable<ComponentProps<typeof TierBoard>> &
  Partial<Record<TierRank, boolean>>;

const RankSandbox = ({
  ranks = [],
  onRanksChange,
  imageMode,
  onImageModeChange,
  ...props
}: NonNullable<ComponentProps<typeof TierBoard>>) => {
  const [currentRanks, setCurrentRanks] = useState(ranks);
  const [currentImageMode, setCurrentImageMode] = useState<TierImageMode>(
    imageMode ?? 'natural',
  );

  const rankKey = ranks.join(',');

  useEffect(() => {
    setCurrentRanks(rankKey ? (rankKey.split(',') as TierRank[]) : []);
  }, [rankKey]);

  useEffect(() => {
    setCurrentImageMode(imageMode ?? 'natural');
  }, [imageMode]);

  return (
    <TierBoardProvider>
      <TierBoard
        {...props}
        ranks={currentRanks}
        imageMode={currentImageMode}
        onImageModeChange={(mode) => {
          setCurrentImageMode(mode);
          onImageModeChange?.(mode);
        }}
        onRanksChange={(nextRanks) => {
          setCurrentRanks(nextRanks);
          onRanksChange?.(nextRanks);
        }}
      />
    </TierBoardProvider>
  );
};

const ControlledImageModeSandbox = () => {
  const [mode, setMode] = useState<TierImageMode>('cover');

  return (
    <TierBoardProvider>
      <button
        type="button"
        className="min-h-11 underline"
        onClick={() => setMode('natural')}
      >
        Change mode from parent
      </button>

      <TierBoard imageMode={mode} onImageModeChange={setMode} />
    </TierBoardProvider>
  );
};

const meta = {
  title: 'Tierlist/TierBoard',
  component: TierBoard,
  args: Object.fromEntries(tierRanks.map((rank) => [rank, true])),
  argTypes: Object.fromEntries(
    tierRanks.map((rank) => [
      rank,
      { control: 'boolean', table: { category: 'Ranks' } },
    ]),
  ),
  parameters: { controls: { include: [...tierRanks, 'imageMode', 'layout'] } },
  render: (args) => {
    const [, updateArgs] = useArgs<StoryArgs>();

    return (
      <RankSandbox
        initialItemCount={args.initialItemCount}
        initialItems={args.initialItems}
        imageMode={args.imageMode}
        onImageModeChange={(mode) => updateArgs({ imageMode: mode })}
        layout={args.layout}
        ranks={tierRanks.filter((rank) => args[rank] !== false)}
        onRanksChange={(ranks) => {
          updateArgs(
            Object.fromEntries(
              tierRanks.map((rank) => [rank, ranks.includes(rank)]),
            ),
          );
        }}
      />
    );
  },
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const ConfigureVariants: Story = {
  args: { 'S−': false },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'tier options' }));
    await userEvent.click(canvas.getByRole('checkbox', { name: 'S−' }));
    await expect(
      canvas.findByRole('listitem', { name: 'S− tier, empty' }),
    ).resolves.toBeVisible();
    await userEvent.click(canvas.getByRole('checkbox', { name: 'S+' }));
    await expect(
      canvas.queryByRole('listitem', { name: 'S+ tier, empty' }),
    ).not.toBeInTheDocument();
  },
};

export const Light: Story = { globals: { theme: 'light' } };
export const Narrow: Story = {
  decorators: [
    (Story) => (
      <div className="max-w-80">
        <Story />
      </div>
    ),
  ],
};

export const AllVariants: Story = {
  play: async ({ canvas }) => {
    const rows = canvas.getAllByRole('listitem');
    const colors = rows.map(
      (row) =>
        getComputedStyle(row.firstElementChild as HTMLElement).backgroundColor,
    );

    await expect(rows).toHaveLength(20);
    await expect(new Set(colors).size).toBe(20);
  },
};

export const KeyboardMovement: Story = {
  play: async ({ canvas, userEvent }) => {
    const item = await canvas.findByRole('button', { name: 'Item 1 in S+' });

    item.focus();
    await userEvent.keyboard('{ArrowDown}');
    await expect(
      canvas.findByRole('button', { name: 'Item 1 in S' }),
    ).resolves.toHaveFocus();
    await expect(
      canvas.getByRole('button', { name: 'Item 1 in S' }),
    ).toHaveStyle({ outlineStyle: 'solid' });
    await userEvent.keyboard('{ArrowUp}');
    await expect(
      canvas.findByRole('button', { name: 'Item 1 in S+' }),
    ).resolves.toHaveFocus();
  },
};

export const KeyboardOrdering: Story = {
  play: async ({ canvas, userEvent }) => {
    const first = await canvas.findByRole('button', { name: 'Item 1 in S+' });
    const second = await canvas.findByRole('button', { name: 'Item 2 in S+' });

    first.focus();
    await userEvent.keyboard('{ArrowRight}');
    await expect(canvas.getByText(/Keyboard mode/)).toBeVisible();
    await expect(
      canvas.getByText('Item 1 moved to S+, position 2'),
    ).toBeInTheDocument();
    await userEvent.keyboard('{ArrowLeft}');
    await expect(
      canvas.getByText('Item 1 moved to S+, position 1'),
    ).toBeInTheDocument();
    await expect(first).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    await expect(first).not.toHaveFocus();
    await expect(canvas.getByText(/Tab to select/)).toBeVisible();
    await expect(second).toBeVisible();
  },
};

export const GamerKeys: Story = {
  play: async ({ canvas, userEvent }) => {
    const item = await canvas.findByRole('button', { name: 'Item 1 in S+' });

    item.focus();
    await userEvent.keyboard('d');
    await expect(
      canvas.getByText('Item 1 moved to S+, position 2'),
    ).toBeInTheDocument();
    await userEvent.keyboard('A');
    await expect(
      canvas.getByText('Item 1 moved to S+, position 1'),
    ).toBeInTheDocument();
    await userEvent.keyboard('s');
    await expect(
      canvas.getByRole('button', { name: 'Item 1 in S' }),
    ).toHaveFocus();
    await userEvent.keyboard('W');
    await expect(
      canvas.getByRole('button', { name: 'Item 1 in S+' }),
    ).toHaveFocus();
  },
};

export const Mobile344: Story = {
  name: 'Mobile 344 · ten items · two lines',
  args: { initialItemCount: 10, layout: 'two-line' },
  parameters: {
    layout: 'fullscreen',
    viewport: {
      options: {
        fold344: {
          name: 'Fold 344',
          styles: { width: '344px', height: '896px' },
        },
      },
    },
  },
  globals: { viewport: { value: 'fold344', isRotated: false } },
  decorators: [
    (Story) => (
      <div className="w-full max-w-86">
        <Story />
      </div>
    ),
  ],
  play: async ({ canvas }) => {
    await expect(
      canvas.findByRole('button', { name: 'Item 10 in S+' }),
    ).resolves.toBeVisible();
    await expect(
      canvas.getAllByRole('button', { name: /^Item / }),
    ).toHaveLength(10);
  },
};

export const FitRectangles: Story = {
  args: { initialItems: aspectRatioTierItems, imageMode: 'contain' },
};

export const FillRectangles: Story = {
  args: { initialItems: aspectRatioTierItems, imageMode: 'cover' },
};

export const OriginalRatio: Story = {
  args: { initialItems: aspectRatioTierItems, imageMode: 'natural' },
};

export const MobileRectangles: Story = {
  ...Mobile344,
  name: 'Mobile 344 · rectangular items',
  args: {
    initialItems: aspectRatioTierItems.slice(0, 12).map((item) => ({
      ...item,
      rank: 'S+' as const,
    })),
    imageMode: 'natural',
    layout: 'two-line',
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.getAllByRole('button', { name: /^Item / }),
    ).toHaveLength(12);
  },
};

export const CropEditing: Story = {
  args: { initialItems: aspectRatioTierItems, imageMode: 'cover' },
  play: async ({ canvas, canvasElement, userEvent }) => {
    const item = canvas.getByRole('button', { name: 'Item 2 in S+' });
    const image = within(item).getByRole('img');
    const page = within(canvasElement.ownerDocument.body);

    item.focus();
    await userEvent.keyboard('{Shift>}[F10]{/Shift}');
    await userEvent.click(
      await page.findByRole('menuitem', { name: 'Edit crop' }),
    );
    await expect(item).toHaveAttribute('data-crop-editing', 'true');
    const preview = item.querySelector('[data-crop-preview]');

    await waitFor(() => {
      expect(preview).not.toBeNull();
      const bounds = preview?.getBoundingClientRect();
      const square = item.getBoundingClientRect();

      expect(bounds?.width).toBeCloseTo(square.height * (16 / 9), 0);
      expect(bounds?.height).toBeCloseTo(square.height, 0);
      expect(getComputedStyle(preview as Element).filter).toBe(
        'brightness(0.4)',
      );
    });

    await waitFor(() => expect(item).toHaveFocus());
    const center = page.getByRole('button', { name: 'Center' });

    await expect(center).toBeDisabled();
    await userEvent.keyboard('{ArrowRight}');
    await expect(center).toBeEnabled();
    await userEvent.click(center);
    await expect(center).toBeDisabled();
    item.focus();
    await userEvent.keyboard('{ArrowRight}{Enter}');
    await waitFor(() =>
      expect(getComputedStyle(image).objectPosition).toBe('52.5% 50%'),
    );
    await expect(item).not.toHaveAttribute('data-crop-editing');
    await expect(item.querySelector('[data-crop-preview]')).toBeNull();
    await expect(item).toHaveAccessibleName('Item 2 in S+');
    await userEvent.keyboard('{Shift>}[F10]{/Shift}');
    await userEvent.click(
      await page.findByRole('menuitem', { name: 'Edit crop' }),
    );
    await waitFor(() => expect(item).toHaveFocus());
    await userEvent.keyboard('{ArrowLeft}{Escape}');
    await waitFor(() =>
      expect(getComputedStyle(image).objectPosition).toBe('52.5% 50%'),
    );
  },
};

export const LandscapeHeightSlider: Story = {
  args: { initialItems: aspectRatioTierItems, imageMode: 'natural' },
  play: async ({ canvas, canvasElement, userEvent }) => {
    const item = canvas.getByRole('button', { name: 'Item 5 in S+' });
    const page = within(canvasElement.ownerDocument.body);
    const original = item.getBoundingClientRect();

    item.focus();
    await userEvent.keyboard('{Shift>}[F10]{/Shift}');
    const slider = await page.findByRole('slider', {
      name: 'Row height expansion',
    });

    fireEvent.change(slider, { target: { value: '50' } });
    await waitFor(() => {
      expect(item.getBoundingClientRect().width).toBeCloseTo(
        original.width * 2,
        0,
      );
    });
    await expect(slider).toHaveValue('50');
    fireEvent.change(slider, { target: { value: '100' } });
    await waitFor(() => {
      const bounds = item.getBoundingClientRect();

      expect(bounds.width).toBeGreaterThan(original.width * 2.9);
      expect(bounds.width / bounds.height).toBeCloseTo(3, 1);
    });
    fireEvent.change(slider, { target: { value: '0' } });
    await waitFor(() =>
      expect(item.getBoundingClientRect().width).toBeCloseTo(original.width, 0),
    );
    await userEvent.keyboard('{Escape}');
  },
};

export const PhysicalKeyboardNavigation: Story = {
  play: async ({ canvas }) => {
    const item = canvas.getByRole('button', { name: 'Item 1 in S+' });

    item.focus();
    fireEvent.keyDown(item, { key: 'д', code: 'KeyD' });
    await expect(
      canvas.getByText('Item 1 moved to S+, position 2'),
    ).toBeInTheDocument();
    fireEvent.keyDown(item, { key: 'а', code: 'KeyA' });
    await expect(
      canvas.getByText('Item 1 moved to S+, position 1'),
    ).toBeInTheDocument();
    fireEvent.keyDown(item, { key: 'с', code: 'KeyS' });
    await expect(item).toHaveAccessibleName('Item 1 in S');
    fireEvent.keyDown(item, { key: 'w', code: 'KeyQ' });
    await expect(item).toHaveAccessibleName('Item 1 in S');
    fireEvent.keyDown(item, { key: 'в', code: 'KeyW' });
    await expect(item).toHaveAccessibleName('Item 1 in S+');
    fireEvent.keyDown(item, { key: 'с', code: 'KeyS', ctrlKey: true });
    await expect(item).toHaveAccessibleName('Item 1 in S+');
  },
};

export const PhysicalKeyboardCrop: Story = {
  args: { initialItems: aspectRatioTierItems, imageMode: 'cover' },
  play: async ({ canvas, canvasElement, userEvent }) => {
    const item = canvas.getByRole('button', { name: 'Item 2 in S+' });
    const image = within(item).getByRole('img');
    const page = within(canvasElement.ownerDocument.body);

    item.focus();
    await userEvent.keyboard('{Shift>}[F10]{/Shift}');
    await userEvent.click(
      await page.findByRole('menuitem', { name: 'Edit crop' }),
    );
    await waitFor(() => expect(item).toHaveFocus());
    fireEvent.keyDown(item, { key: 'д', code: 'KeyD' });
    fireEvent.keyDown(item, { key: 'Enter', code: 'NumpadEnter' });
    await waitFor(() =>
      expect(getComputedStyle(image).objectPosition).toBe('52.5% 50%'),
    );
    await expect(item).not.toHaveAttribute('data-crop-editing');
    await expect(item).toHaveAccessibleName('Item 2 in S+');
  },
};

export const FullSlotHitArea: Story = {
  args: { initialItems: aspectRatioTierItems, imageMode: 'natural' },
  play: async ({ canvas, canvasElement }) => {
    const item = canvas.getByRole('button', { name: 'Item 5 in S+' });
    const portrait = canvas.getByRole('button', { name: 'Item 1 in S+' });

    await waitFor(() => {
      const bounds = item.getBoundingClientRect();
      const portraitBounds = portrait.getBoundingClientRect();
      const imageHeight = bounds.width / 3;
      const hit = canvasElement.ownerDocument.elementFromPoint(
        bounds.left + bounds.width / 2,
        bounds.top + (bounds.height - imageHeight) / 4,
      );

      expect(bounds.height).toBeCloseTo(portraitBounds.height, 1);
      expect(hit?.closest('[data-tier-item]')).toBe(item);
      expect(getComputedStyle(within(item).getByRole('img')).objectFit).toBe(
        'contain',
      );
    });
  },
};

export const PortraitCropControls: Story = {
  args: { initialItems: aspectRatioTierItems, imageMode: 'cover' },
  play: async ({ canvas, canvasElement, userEvent }) => {
    const item = canvas.getByRole('button', { name: 'Item 1 in S+' });
    const page = within(canvasElement.ownerDocument.body);

    item.focus();
    await userEvent.keyboard('{Shift>}[F10]{/Shift}');
    await userEvent.click(
      await page.findByRole('menuitem', { name: 'Edit crop' }),
    );
    const controls = await page.findByRole('group', {
      name: 'Crop controls for item 1',
    });

    const expectBelowImage = async () => {
      await waitFor(() => {
        const preview = item.querySelector('[data-crop-preview]');
        const imageBounds = preview?.getBoundingClientRect();
        const controlsBounds = controls.getBoundingClientRect();
        const rem = Number.parseFloat(
          getComputedStyle(canvasElement.ownerDocument.documentElement)
            .fontSize,
        );

        expect(imageBounds).toBeDefined();
        expect(controlsBounds.top - (imageBounds?.bottom ?? 0)).toBeCloseTo(
          rem * 0.5,
          0,
        );
      });
    };

    await expectBelowImage();
    await waitFor(() => expect(item).toHaveFocus());
    await userEvent.keyboard('{ArrowUp}');
    await expectBelowImage();
    await userEvent.keyboard('{Escape}');
  },
};

export const FullHeightImageSlider: Story = {
  args: { initialItems: aspectRatioTierItems, imageMode: 'natural' },
  play: async ({ canvas, canvasElement, userEvent }) => {
    const item = canvas.getByRole('button', { name: 'Item 1 in S+' });
    const page = within(canvasElement.ownerDocument.body);

    item.focus();
    await userEvent.keyboard('{Shift>}[F10]{/Shift}');
    const slider = await page.findByRole('slider', {
      name: 'Row height expansion',
    });
    const thumb = slider.closest('[data-slot="slider-thumb"]');

    await expect(slider).toBeDisabled();
    await expect(slider).toHaveValue('100');
    await expect(thumb).not.toBeNull();
    await userEvent.hover(thumb as HTMLElement);
    await expect(await page.findByRole('tooltip')).toHaveTextContent(
      'Full row height',
    );
    fireEvent.change(slider, { target: { value: '50' } });
    await expect(slider).toHaveValue('100');
    await userEvent.keyboard('{Escape}');
  },
};

export const IndependentBoards: Story = {
  // This isolation fixture repeats the same default landmark names in one document.
  parameters: {
    a11y: { config: { rules: [{ id: 'landmark-unique', enabled: false }] } },
  },
  render: () => (
    <div className="space-y-8">
      <TierBoardProvider>
        <TierBoard />
      </TierBoardProvider>

      <TierBoardProvider>
        <TierBoard />
      </TierBoardProvider>
    </div>
  ),
  play: async ({ canvas, userEvent }) => {
    const [first, second] = canvas.getAllByRole('region', {
      name: 'Anime tierlist',
    });
    const firstBoard = within(first);
    const secondBoard = within(second);
    const item = firstBoard.getByRole('button', { name: 'Item 1 in S+' });

    item.focus();
    await userEvent.keyboard('{Enter}');
    await expect(firstBoard.getByText(/^Keyboard mode/)).toBeInTheDocument();
    await expect(
      secondBoard.queryByText(/^Keyboard mode/),
    ).not.toBeInTheDocument();
    await userEvent.selectOptions(
      firstBoard.getByRole('combobox', { name: 'Image sizing' }),
      'cover',
    );
    await expect(item).toHaveAttribute('data-image-mode', 'cover');
    await expect(
      secondBoard.getByRole('button', { name: 'Item 1 in S+' }),
    ).toHaveAttribute('data-image-mode', 'natural');
  },
};

export const ControlledImageMode: Story = {
  render: () => <ControlledImageModeSandbox />,
  play: async ({ canvas, userEvent }) => {
    const item = canvas.getByRole('button', { name: 'Item 1 in S+' });

    await expect(item).toHaveAttribute('data-image-mode', 'cover');
    await userEvent.click(
      canvas.getByRole('button', { name: 'Change mode from parent' }),
    );
    await waitFor(() =>
      expect(item).toHaveAttribute('data-image-mode', 'natural'),
    );
    await userEvent.selectOptions(
      canvas.getByRole('combobox', { name: 'Image sizing' }),
      'contain',
    );
    await waitFor(() =>
      expect(item).toHaveAttribute('data-image-mode', 'contain'),
    );
  },
};

export const FixedImageMode: Story = {
  render: () => (
    <TierBoardProvider>
      <TierBoard imageMode="contain" />
    </TierBoardProvider>
  ),
  play: async ({ canvas, userEvent }) => {
    const mode = canvas.getByRole('combobox', { name: 'Image sizing' });

    await userEvent.selectOptions(mode, 'cover');
    await expect(mode).toHaveValue('contain');
    await expect(
      canvas.getByRole('button', { name: 'Item 1 in S+' }),
    ).toHaveAttribute('data-image-mode', 'contain');
  },
};

export const OriginalRatioCrop: Story = {
  args: {
    imageMode: 'natural',
    initialItems: [
      {
        id: 'trim-test',
        label: 'Trim test',
        rank: 'S+',
        image: {
          src: '/tier-samples/landscape.svg',
          width: 1600,
          height: 900,
          alt: 'Landscape TEST',
        },
      },
    ],
  },
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    const item = await canvas.findByRole('button', {
      name: 'Item Trim test in S+',
    });
    fireEvent.contextMenu(item);
    await userEvent.click(
      await page.findByRole('menuitem', { name: 'Edit crop' }),
    );
    const right = await page.findByRole('slider', { name: 'right crop edge' });
    [1, 2, 3, 4, 5].forEach(() => {
      fireEvent.keyDown(right, { code: 'ArrowLeft', shiftKey: true });
    });
    await userEvent.click(page.getByRole('button', { name: 'Done' }));
    await waitFor(() =>
      expect(
        Number(
          item.querySelector('svg')?.getAttribute('viewBox')?.split(' ')[2],
        ),
      ).toBeCloseTo(800),
    );
    fireEvent.contextMenu(item);
    const expansion = await page.findByRole('slider', {
      name: 'Row height expansion',
    });
    await expect(expansion).toHaveAttribute('aria-valuenow', '100');
    await expect(expansion).toBeDisabled();
    await userEvent.click(page.getByRole('menuitem', { name: 'Reset crop' }));
    await waitFor(() =>
      expect(item.querySelector('svg')).toHaveAttribute(
        'viewBox',
        '0 0 1600 900',
      ),
    );
  },
};
