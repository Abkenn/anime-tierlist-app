import type { TierImage } from './tierlist.types';

export type AnimeSearchResult = {
  malId?: number;
  id: string;
  title: string;
  imageUrl: string;
  image?: TierImage;
};
export type AnimeSearchPage = {
  items: AnimeSearchResult[];
  nextPage: number | null;
};
export type CuratedAnimeImage = AnimeSearchResult & { keywords: string[] };

export type AnimeSearchSeed = {
  initialQuery?: string;
  initialPage?: AnimeSearchPage;
};
