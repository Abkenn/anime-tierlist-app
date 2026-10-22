import type { TierItemData } from '@/app/_types/tierlist.types';

export const homeTierItems: TierItemData[] = [
  {
    id: 'sample-square',
    label: 'Square TEST',
    rank: 'S+',
    image: {
      src: '/tier-samples/square.svg',
      width: 1000,
      height: 1000,
      alt: 'Square gradient with TEST arranged in two rows',
    },
  },
  {
    id: 'sample-portrait',
    label: 'Portrait TEST',
    rank: 'S+',
    image: {
      src: '/tier-samples/portrait.svg',
      width: 900,
      height: 1600,
      alt: 'Portrait gradient with TEST arranged vertically',
    },
  },
  {
    id: 'sample-landscape',
    label: 'Landscape TEST',
    rank: 'S',
    image: {
      src: '/tier-samples/landscape.svg',
      width: 1600,
      height: 900,
      alt: 'Landscape gradient with TEST arranged horizontally',
    },
  },
];
