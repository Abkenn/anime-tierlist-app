'use client';

import { type PropsWithChildren, ViewTransition } from 'react';
import { OfflinePreview } from '@/app/_components/offline/offline-preview';
import { useOfflineMode } from '@/app/_hooks/use-offline-mode';

export const HomeMode = ({ children }: PropsWithChildren) => {
  const mode = useOfflineMode();
  return (
    <ViewTransition
      key={mode ? 'offline' : 'online'}
      default="none"
      enter="preview-change"
      exit="preview-change"
    >
      <div>{mode ? <OfflinePreview /> : children}</div>
    </ViewTransition>
  );
};
