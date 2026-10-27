'use client';

import { useAtom, useAtomValue } from 'jotai';
import { usePathname } from 'next/navigation';
import { useDeferredValue } from 'react';
import {
  renamingItemIdAtom,
  tierFindQueryAtom,
} from '@/app/_atoms/tierlist/find.atoms';
import { editingItemIdAtom } from '@/app/_atoms/tierlist/interaction.atoms';
import { tierItemsAtom } from '@/app/_atoms/tierlist/items.atoms';
import { matchesTierItemLabel } from '@/app/_lib/tier-item-label';
import { TierlistFind } from './tierlist-find';

export const TierBoardFind = () => {
  const [query, setQuery] = useAtom(tierFindQueryAtom);
  const items = useAtomValue(tierItemsAtom);
  const editing = useAtomValue(editingItemIdAtom);
  const renaming = useAtomValue(renamingItemIdAtom);
  const pathname = usePathname();
  const deferredQuery = useDeferredValue(query);
  const count = items.filter((item) =>
    matchesTierItemLabel(item, deferredQuery),
  ).length;

  return (
    <TierlistFind
      query={query}
      onQueryChange={setQuery}
      count={count}
      disabled={Boolean(
        editing ||
          renaming ||
          (pathname && pathname !== '/' && pathname !== '/offline'),
      )}
    />
  );
};
