import type {
  TierImage,
  TierItemData,
  TierRank,
} from '@/app/_types/tierlist.types';

const fixtureImages: TierImage[] = [
  {
    src: '/storybook/tier-portrait.svg',
    width: 900,
    height: 1600,
    alt: 'Portrait 9:16 gradient poster',
  },
  {
    src: '/storybook/tier-landscape.svg',
    width: 1600,
    height: 900,
    alt: 'Landscape 16:9 gradient poster',
  },
  {
    src: '/storybook/tier-square.svg',
    width: 1000,
    height: 1000,
    alt: 'Square 1:1 gradient poster',
  },
  {
    src: '/storybook/tier-portrait-2-3.svg',
    width: 1000,
    height: 1500,
    alt: 'Portrait 2:3 gradient poster',
  },
  {
    src: '/storybook/tier-panorama.svg',
    width: 2700,
    height: 900,
    alt: 'Panorama 3:1 gradient poster',
  },
  {
    src: '/storybook/tier-landscape-4-3.svg',
    width: 1200,
    height: 900,
    alt: 'Landscape 4:3 gradient poster',
  },
  {
    src: '/storybook/tier-portrait-3-4.svg',
    width: 900,
    height: 1200,
    alt: 'Portrait 3:4 gradient poster',
  },
  {
    src: '/storybook/tier-landscape-3-2.svg',
    width: 1500,
    height: 1000,
    alt: 'Landscape 3:2 gradient poster',
  },
  {
    src: '/storybook/tier-portrait-1-2.svg',
    width: 800,
    height: 1600,
    alt: 'Tall portrait 1:2 gradient poster',
  },
  {
    src: '/storybook/tier-ultrawide-21-9.svg',
    width: 2100,
    height: 900,
    alt: 'Ultrawide 21:9 gradient poster',
  },
  {
    src: '/storybook/tier-portrait-1-3.svg',
    width: 600,
    height: 1800,
    alt: 'Tall portrait 1:3 gradient poster',
  },
  {
    src: '/storybook/tier-banner-5-1.svg',
    width: 2500,
    height: 500,
    alt: 'Wide banner 5:1 gradient poster',
  },
];
const fixtureRanks: TierRank[] = ['S+', 'S', 'A+', 'A'];

export const aspectRatioTierItems: TierItemData[] = Array.from(
  { length: fixtureImages.length * 2 },
  (_, index) => ({
    id: `aspect-ratio-${index + 1}`,
    label: String(index + 1),
    rank: fixtureRanks[Math.floor(index / 6)],
    image: fixtureImages[index % fixtureImages.length],
  }),
);
