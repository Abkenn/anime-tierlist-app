'use client';

import { cn } from 'cn';
import { useAtomValue } from 'jotai';
import { tierDragRegionAtom } from '@/app/_atoms/tierlist/interaction.atoms';

export const AnimeSearchDiscard = () => {
  const region = useAtomValue(tierDragRegionAtom);

  if (!region) {
    return null;
  }

  return (
    <div
      role="status"
      data-tier-discard=""
      className={cn(
        'pointer-events-none absolute inset-0 z-40 flex min-h-40 items-center justify-center border border-divider bg-background/70 text-sm text-foreground backdrop-blur-xs transition-colors',
        region === 'discard' && 'bg-muted/80',
      )}
    >
      {region === 'discard' ? 'Release to discard' : 'Drag here to discard'}
    </div>
  );
};
