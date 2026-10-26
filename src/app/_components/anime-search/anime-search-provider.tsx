'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { useHydrateAtoms } from 'jotai/utils';
import type { PropsWithChildren } from 'react';
import {
  type AnimeSearchConfig,
  animeSearchClientAtom,
  animeSearchConfigAtom,
} from '@/app/_atoms/tierlist/search.atoms';

type AnimeSearchProviderProps = PropsWithChildren<AnimeSearchConfig>;

export const AnimeSearchProvider = ({
  children,
  ...config
}: AnimeSearchProviderProps) => {
  useHydrateAtoms([[animeSearchConfigAtom, config]]);

  const client = useAtomValue(animeSearchClientAtom);

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};
