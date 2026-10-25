import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { type ComponentProps, useEffect, useState } from 'react';
import { useArgs } from 'storybook/preview-api';
import { expect, fireEvent, waitFor, within } from 'storybook/test';
import { aspectRatioTierItems } from '@/app/_components/tier-item/tier-image.fixtures';
import { curatedAnimeImages } from '@/app/_lib/curated-anime';
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
    const preview = canvasElement.ownerDocument.querySelector(
      '[data-crop-preview]',
    );

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
    await expect(
      canvasElement.ownerDocument.querySelector('[data-crop-preview]'),
    ).toBeNull();
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

    await expect(slider).toHaveValue('100');
    fireEvent.change(slider, { target: { value: '50' } });
    await waitFor(() => {
      expect(item.getBoundingClientRect().width).toBeCloseTo(
        (original.width * 2) / 3,
        0,
      );
    });
    await expect(slider).toHaveValue('50');
    fireEvent.change(slider, { target: { value: '100' } });
    await waitFor(() => {
      const bounds = item.getBoundingClientRect();

      expect(bounds.width).toBeCloseTo(original.width, 0);
      expect(bounds.width / bounds.height).toBeCloseTo(3, 1);
    });
    fireEvent.change(slider, { target: { value: '0' } });
    await waitFor(() =>
      expect(item.getBoundingClientRect().width).toBeCloseTo(
        original.width / 3,
        0,
      ),
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
        const preview = canvasElement.ownerDocument.querySelector(
          '[data-crop-preview]',
        );
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
      'cover',
    );
    await userEvent.click(canvas.getByRole('button', { name: 'Fit' }));
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
    await expect(mode).toHaveValue('cover');
    await userEvent.click(canvas.getByRole('button', { name: 'Fill' }));
    await expect(canvas.getByRole('button', { name: 'Fit' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
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
      await page.findByRole('menuitem', { name: 'Edit trim' }),
    );
    const right = await page.findByRole('slider', { name: 'right crop edge' });
    [1, 2, 3, 4, 5].forEach(() => {
      fireEvent.keyDown(right, { code: 'ArrowLeft', shiftKey: true });
    });
    await userEvent.click(page.getByRole('button', { name: 'Done' }));
    await waitFor(() =>
      expect(
        Number(
          item
            .querySelector('svg[role="img"]')
            ?.getAttribute('viewBox')
            ?.split(' ')[2],
        ),
      ).toBeCloseTo(800),
    );
    fireEvent.contextMenu(item);
    const expansion = await page.findByRole('slider', {
      name: 'Row height expansion',
    });
    await expect(expansion).toHaveAttribute('aria-valuenow', '100');
    await expect(expansion).toBeDisabled();
    await userEvent.click(page.getByRole('menuitem', { name: 'Reset trim' }));
    await waitFor(() =>
      expect(item.querySelector('svg[role="img"]')).toHaveAttribute(
        'viewBox',
        '0 0 1600 900',
      ),
    );
  },
};

export const CustomRatioPosition: Story = {
  args: {
    imageMode: 'natural',
    initialItems: [
      {
        id: 'position-test',
        label: 'Position test',
        rank: 'S+',
        trim: { left: 0.25, top: 0.1, right: 0.75, bottom: 0.9 },
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
      name: 'Item Position test in S+',
    });
    const originalWidth = item.getBoundingClientRect().width;

    const image = () => item.querySelector('svg[role="img"]');

    fireEvent.contextMenu(item);
    await userEvent.click(
      await page.findByRole('menuitem', { name: 'Edit crop' }),
    );
    await expect(item).toHaveAttribute('data-trim-positioning', 'true');
    await expect(
      canvasElement.ownerDocument.querySelector('[data-crop-preview]'),
    ).toBeInTheDocument();
    await expect(
      page.queryByRole('dialog', { name: 'Edit custom ratio crop' }),
    ).not.toBeInTheDocument();
    await waitFor(() => expect(item).toHaveFocus());
    await userEvent.keyboard('{ArrowRight}');
    await waitFor(() =>
      expect(
        Number(image()?.getAttribute('viewBox')?.split(' ')[0]),
      ).toBeCloseTo(440),
    );
    await expect(item.getBoundingClientRect().width).toBeCloseTo(originalWidth);
    await userEvent.keyboard('{Escape}');
    await waitFor(() =>
      expect(image()).toHaveAttribute('viewBox', '400 90 800 720'),
    );
    fireEvent.contextMenu(item);
    await userEvent.click(
      await page.findByRole('menuitem', { name: 'Edit crop' }),
    );
    await waitFor(() => expect(item).toHaveFocus());
    await userEvent.keyboard('w{Enter}');
    await waitFor(() =>
      expect(
        Number(image()?.getAttribute('viewBox')?.split(' ')[1]),
      ).toBeCloseTo(67.5),
    );
    await expect(item).not.toHaveAttribute('data-trim-positioning');
    fireEvent.contextMenu(item);
    await userEvent.click(
      await page.findByRole('menuitem', { name: 'Edit crop' }),
    );
    await userEvent.click(page.getByRole('button', { name: 'Center' }));
    await userEvent.click(page.getByRole('button', { name: 'Done' }));
    await waitFor(() =>
      expect(
        Number(image()?.getAttribute('viewBox')?.split(' ')[1]),
      ).toBeCloseTo(90),
    );
  },
};

export const TopRowCropOverflow: Story = {
  args: {
    imageMode: 'natural',
    initialItems: [
      {
        id: 'top-row',
        label: 'Top row',
        rank: 'S+',
        trim: { left: 0, right: 1, top: 0.25, bottom: 0.75 },
        image: {
          src: '/tier-samples/portrait.svg',
          width: 900,
          height: 1600,
          alt: 'Portrait TEST',
        },
      },
    ],
  },
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    const item = await canvas.findByRole('button', {
      name: 'Item Top row in S+',
    });
    fireEvent.contextMenu(item);
    await userEvent.click(
      await page.findByRole('menuitem', { name: 'Edit crop' }),
    );
    await waitFor(() => {
      const overlay = canvasElement.ownerDocument.querySelector(
        '[data-crop-overlay]',
      );
      const bounds = overlay?.getBoundingClientRect();

      expect(overlay?.parentElement).toBe(canvasElement.ownerDocument.body);
      expect(bounds?.top).toBeLessThan(item.getBoundingClientRect().top);
      expect(bounds?.bottom).toBeGreaterThan(
        item.getBoundingClientRect().bottom,
      );
    });
  },
};

export const ItemText: Story = {
  args: {
    imageMode: 'natural',
    initialItems: [
      {
        id: 'text-test',
        label: 'Text test',
        rank: 'S+',
        image: {
          src: '/tier-samples/portrait.svg',
          width: 900,
          height: 1600,
          alt: 'Portrait TEST',
        },
      },
    ],
  },
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    const item = await canvas.findByRole('button', {
      name: 'Item Text test in S+',
    });
    fireEvent.contextMenu(item);
    await userEvent.click(
      await page.findByRole('menuitem', { name: 'Add text' }),
    );
    const text = await page.findByRole('textbox', { name: 'Title' });
    await userEvent.type(text, 'Heavenly{Enter}Delusion');
    const hex = page.getByRole('textbox', { name: 'Hex color' });
    await userEvent.clear(hex);
    await userEvent.type(hex, '#ff0');
    await userEvent.selectOptions(
      page.getByRole('combobox', { name: 'Position' }),
      'top',
    );
    await userEvent.click(page.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(item.querySelector('[data-tier-title]')).toHaveTextContent(
        'Heavenly Delusion',
      ),
    );

    const title = () => item.querySelector('[data-tier-title] > span > span');

    await expect(title()).toHaveClass('top-1');
    await expect(getComputedStyle(title() as Element).color).toBe(
      'rgb(255, 255, 0)',
    );
    await userEvent.selectOptions(
      canvas.getByRole('combobox', { name: 'Image sizing' }),
      'cover',
    );
    fireEvent.contextMenu(item);
    await userEvent.click(
      await page.findByRole('menuitem', { name: 'Edit text' }),
    );
    await userEvent.clear(page.getByRole('textbox', { name: 'Title' }));
    await userEvent.type(
      page.getByRole('textbox', { name: 'Title' }),
      'Cancelled',
    );
    await userEvent.click(page.getByRole('button', { name: 'Cancel' }));
    await expect(item.querySelector('[data-tier-title]')).toHaveTextContent(
      'Heavenly Delusion',
    );
    await userEvent.selectOptions(
      canvas.getByRole('combobox', { name: 'Image sizing' }),
      'cover',
    );
    await userEvent.click(canvas.getByRole('button', { name: 'Fit' }));
    fireEvent.contextMenu(item);
    await userEvent.click(
      await page.findByRole('menuitem', { name: 'Edit text' }),
    );
    await userEvent.click(page.getByRole('checkbox', { name: 'Wrap text' }));
    await userEvent.selectOptions(
      page.getByRole('combobox', { name: 'Position' }),
      'middle',
    );
    await userEvent.click(page.getByRole('button', { name: 'Save' }));
    await expect(title()).toHaveClass('top-1/2');
    fireEvent.contextMenu(item);
    await userEvent.click(
      await page.findByRole('menuitem', { name: 'Edit text' }),
    );
    await userEvent.click(page.getByRole('button', { name: 'Remove text' }));
    await expect(item.querySelector('[data-tier-title]')).toBeNull();
  },
};

export const DenseLibrary: Story = {
  args: {
    imageMode: 'natural',
    initialItems: Array.from({ length: 500 }, (_, index) => ({
      ...aspectRatioTierItems[index % aspectRatioTierItems.length],
      id: `dense-${index}`,
      rank: tierRanks[index % tierRanks.length],
    })),
  },
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      const list = canvasElement.querySelector('ol');
      const labels = [
        ...canvasElement.querySelectorAll('[data-tier-rank] > div:first-child'),
      ].map((label) => label.getBoundingClientRect().width);
      const items = [...canvasElement.querySelectorAll('[data-tier-item]')].map(
        (item) => item.getBoundingClientRect().height,
      );

      expect(
        Number(
          list && getComputedStyle(list).getPropertyValue('--tier-density'),
        ),
      ).toBeCloseTo(0.85);
      expect(labels.length).toBeGreaterThan(1);
      expect(Math.max(...labels) - Math.min(...labels)).toBeLessThan(0.1);
      expect(items.length).toBeGreaterThan(0);
      expect(items.length).toBeLessThan(500);
      expect(canvasElement.textContent).toContain('500 items');
      expect(Math.min(...items)).toBeGreaterThan(0);
      expect(Math.max(...items) - Math.min(...items)).toBeLessThan(0.1);
    });
  },
};

export const RenameAndFind: Story = {
  args: {
    initialItems: [
      {
        ...aspectRatioTierItems[0],
        id: 'find-one',
        label: 'Unknown',
        rank: 'S+',
      },
      {
        ...aspectRatioTierItems[1],
        id: 'find-two',
        label: 'Another anime',
        rank: 'S',
      },
    ],
  },
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    const item = await canvas.findByRole('button', {
      name: 'Item Unknown in S+',
    });
    fireEvent.contextMenu(item);
    await userEvent.click(
      await page.findByRole('menuitem', { name: 'Rename Label' }),
    );
    const label = await page.findByRole('textbox', { name: 'Item label' });
    await userEvent.clear(label);
    await userEvent.type(label, 'Your Lie in April');
    await userEvent.click(page.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(item).toHaveAccessibleName('Item Your Lie in April in S+'),
    );
    fireEvent.keyDown(window, { code: 'KeyF', ctrlKey: true });
    const find = await page.findByRole('textbox', {
      name: 'Find anime in tierlist',
    });
    await userEvent.type(find, 'your lie');
    await expect(
      canvas.getByRole('button', { name: 'Item Another anime in S' }),
    ).toHaveClass('opacity-20');
    await expect(page.getByText('1 found')).toBeVisible();
    fireEvent.keyDown(find, { code: 'Escape' });
    await waitFor(() =>
      expect(
        canvas.getByRole('button', { name: 'Item Another anime in S' }),
      ).not.toHaveClass('opacity-20'),
    );
  },
};

export const ScrollOverview: Story = {
  render: () => (
    <TierBoardProvider>
      <div className="flex h-[calc(100dvh-2rem)] min-h-0 flex-col">
        <TierBoard
          ranks={tierRanks}
          initialItems={curatedAnimeImages
            .slice(0, 18)
            .map((poster, index) => ({
              id: poster.id,
              label: poster.title,
              image: poster.image,
              rank: tierRanks[index % tierRanks.length],
            }))}
        />
      </div>
    </TierBoardProvider>
  ),
  play: async ({ canvasElement }) => {
    const viewport = canvasElement.querySelector<HTMLElement>(
      '[data-tier-viewport]',
    );
    if (!viewport) {
      throw new Error('Tierlist viewport is missing.');
    }

    viewport.scrollTop = 200;
    fireEvent.scroll(viewport);
    const preview = await within(canvasElement).findByRole('navigation', {
      name: 'Tierlist overview',
    });

    expect(getComputedStyle(preview).overflowY).toBe('clip');
    fireEvent.wheel(preview, { deltaY: 100 });
    await waitFor(() => expect(viewport.scrollTop).toBe(300));
    fireEvent.wheel(preview, { deltaY: -60 });
    await waitFor(() => expect(viewport.scrollTop).toBe(240));
    expect(preview.scrollTop).toBe(0);
    fireEvent.wheel(preview, { deltaY: 100, ctrlKey: true });
    expect(viewport.scrollTop).toBe(240);
  },
};
