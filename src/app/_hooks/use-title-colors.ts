'use client';

import { useEffect, useEffectEvent, useState } from 'react';
import { usesAutomaticTitleColor } from '@/app/_lib/tier-item-title';
import { resolvePosterTitleColor } from '@/app/_services/poster-title-color';
import type {
  HexColor,
  TierImageMode,
  TierItemData,
} from '@/app/_types/tierlist.types';

const empty = new Map<string, HexColor>();

export const useTitleColors = (items: TierItemData[], mode: TierImageMode) => {
  const [result, setResult] = useState<{
    key: string;
    colors: ReadonlyMap<string, HexColor>;
  }>();
  const automatic = items.filter(
    (item) =>
      item.title && usesAutomaticTitleColor(item.title) && item.title.text,
  );
  const key = JSON.stringify([mode, automatic]);
  const resolve = useEffectEvent(
    async (identity: string, signal: AbortSignal) => {
      const colors = await Promise.all(
        automatic.map(
          async (item): Promise<[string, HexColor]> => [
            item.id,
            await resolvePosterTitleColor(item, mode),
          ],
        ),
      );
      if (!signal.aborted) {
        setResult({ key: identity, colors: new Map(colors) });
      }
    },
  );

  useEffect(() => {
    if (!automatic.length) {
      return;
    }
    const controller = new AbortController();
    void resolve(key, controller.signal);

    return () => controller.abort();
  }, [key, automatic.length]);

  return result?.key === key ? result.colors : empty;
};
