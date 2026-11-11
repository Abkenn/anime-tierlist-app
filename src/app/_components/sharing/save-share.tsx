'use client';

import { Share2 } from 'lucide-react';
import { lazy, Suspense, useState } from 'react';
import type { SaveShareProps } from './share-panel';

const SharePanel = lazy(async () => ({
  default: (await import('./share-panel')).SharePanel,
}));

export const SaveShare = (props: SaveShareProps) => {
  const [activated, setActivated] = useState(false);
  const trigger = (
    <button
      type="button"
      disabled={props.disabled}
      aria-haspopup="dialog"
      aria-expanded={activated}
      onClick={() => setActivated(true)}
      className="inline-flex min-h-9 shrink-0 cursor-pointer items-center gap-2 border border-foreground/40 px-3 font-medium text-foreground hover:bg-accent active:opacity-70 disabled:opacity-50"
    >
      <Share2 aria-hidden="true" className="size-3.5" />
      Share
    </button>
  );

  return activated ? (
    <Suspense fallback={trigger}>
      <SharePanel {...props} initialOpen />
    </Suspense>
  ) : (
    trigger
  );
};
