'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useHydrateAtoms } from 'jotai/utils';
import { type PropsWithChildren, useState } from 'react';
import {
  type AnimeSearchConfig,
  animeSearchConfigAtom,
} from '@/app/_atoms/tierlist/search.atoms';

type AnimeSearchProviderProps = PropsWithChildren<AnimeSearchConfig>;

export const AnimeSearchProvider = ({
  children,
  ...config
}: AnimeSearchProviderProps) => {
  useHydrateAtoms([[animeSearchConfigAtom, config]]);

  const [client] = useState(() => new QueryClient());

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};
