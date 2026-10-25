import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fireEvent, waitFor, within } from 'storybook/test';
import { testTierItems } from '@/app/_components/tier-item/tier-test.fixtures';
import { TierBoard } from '@/app/_components/tierlist';
import { Toaster } from '@/app/_components/ui/toast';
import { curatedAnimeImages } from '@/app/_lib/curated-anime';
import { tierRanks } from '@/app/_lib/tier-ranks';
import { TierBoardProvider } from '@/app/_providers/tier-board-provider';
import { AnimeSearchDiscard } from './anime-search-discard';
import { AnimeSearchProvider } from './anime-search-provider';
import { AnimeSearchResults } from './anime-search-results';

const meta = {
  title: 'Anime/Search',
  component: AnimeSearchProvider,
  args: { curatedImages: [] },
  render: (args) => (
    <TierBoardProvider>
      <div className="grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <aside className="relative min-w-0 lg:grid lg:min-h-0 lg:grid-rows-[minmax(0,1fr)] lg:self-stretch lg:contain-size">
          <AnimeSearchProvider {...args}>
            <AnimeSearchResults />
          </AnimeSearchProvider>
        </aside>

        <TierBoard initialItemCount={0} />

        <Toaster />
      </div>
    </TierBoardProvider>
  ),
} satisfies Meta<typeof AnimeSearchProvider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
export const DirectImageImport: Story = {
  play: async ({ canvas, canvasElement, userEvent }) => {
    const input = canvas.getByRole('searchbox');
    const origin = canvasElement.ownerDocument.location.origin;
    fireEvent.change(input, {
      target: { value: `${origin}/tier-samples/portrait.svg` },
    });
    const image = await canvas.findByRole('img', { name: 'Unknown' });
    const card = image.closest('button');
    await waitFor(() => expect(card).toBeEnabled());
    if (!card) {
      throw new Error('Missing image card');
    }
    await userEvent.click(card);
    await canvas.findByRole('button', {
      name: 'Item Unknown in Watching',
    });
    await waitFor(() => expect(card).not.toBeInTheDocument());
    const page = within(canvasElement.ownerDocument.body);
    await page.findByText('Unknown added to Watching');
    await userEvent.click(page.getByRole('button', { name: 'Undo' }));
    await waitFor(() =>
      expect(
        canvas.queryByRole('button', { name: 'Item Unknown in Watching' }),
      ).not.toBeInTheDocument(),
    );
    fireEvent.change(input, {
      target: { value: 'https://example.com/not-an-image' },
    });
    await canvas.findByText(/Use a direct image URL/);
  },
};

export const OfflineImagePlayground: Story = {
  args: {
    initialQuery: 'test',
    catalogSearchEnabled: false,
    curatedImages: testTierItems.flatMap((item) =>
      item.image
        ? [
            {
              id: item.id,
              title: item.label,
              imageUrl: item.image.src,
              image: item.image,
              keywords: ['test', item.label],
            },
          ]
        : [],
    ),
  },
  render: (args) => (
    <TierBoardProvider>
      <div className="grid items-start gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <aside
          aria-label="Anime search"
          className="relative min-w-0 lg:grid lg:min-h-0 lg:grid-rows-[minmax(0,1fr)] lg:self-stretch lg:contain-size"
        >
          <AnimeSearchProvider {...args}>
            <AnimeSearchResults />
          </AnimeSearchProvider>

          <AnimeSearchDiscard />
        </aside>

        <div className="min-w-0">
          <TierBoard initialItems={testTierItems} />
        </div>

        <Toaster />
      </div>
    </TierBoardProvider>
  ),
};

export const CuratedPosters: Story = {
  args: {
    curatedImages: curatedAnimeImages,
    initialQuery: 'Frieren',
    catalogSearchEnabled: false,
  },
};

export const CuratedBlending: Story = {
  args: {
    initialQuery: 'oshi',
    catalogSearchEnabled: false,
    curatedImages: curatedAnimeImages,
    initialPage: {
      items: [1, 2, 3, 4, 5].map((id) => ({
        id: `fetched-${id}`,
        title: `Oshi no Ko poster ${id}`,
        imageUrl: '/tier-samples/portrait.svg',
        image: {
          src: '/tier-samples/portrait.svg',
          width: 200,
          height: 400,
          alt: `Oshi no Ko poster ${id}`,
        },
      })),
      nextPage: null,
    },
  },
};

export const LargeLibrary: Story = {
  args: {
    initialQuery: 'test',
    catalogSearchEnabled: false,
    curatedImages: [],
    initialPage: {
      items: Array.from({ length: 5000 }, (_, index) => ({
        id: `large-search-${index}`,
        title: `Search poster ${index}`,
        imageUrl: '/tier-samples/portrait.svg',
        image: {
          src: '/tier-samples/portrait.svg',
          width: 200,
          height: 400,
          alt: `Search poster ${index}`,
        },
      })),
      nextPage: null,
    },
  },
  render: (args) => (
    <TierBoardProvider>
      <main className="grid h-[calc(100dvh-2rem)] min-h-0 min-w-0 grid-cols-1 grid-rows-[minmax(0,0.35fr)_minmax(0,0.65fr)] gap-4 lg:grid-cols-[16rem_minmax(0,1fr)] lg:grid-rows-1">
        <aside
          aria-label="Anime search"
          className="relative flex min-h-0 min-w-0 flex-col"
        >
          <AnimeSearchProvider {...args}>
            <AnimeSearchResults />
          </AnimeSearchProvider>
          <AnimeSearchDiscard />
        </aside>
        <TierBoard
          ranks={tierRanks}
          initialItems={Array.from({ length: 5000 }, (_, index) => ({
            id: `large-board-${index}`,
            label: `Board poster ${index}`,
            rank: tierRanks[index % tierRanks.length],
            image: {
              src: '/tier-samples/portrait.svg',
              width: 200,
              height: 400,
              alt: `Board poster ${index}`,
            },
          }))}
        />
        <Toaster />
      </main>
    </TierBoardProvider>
  ),
};
