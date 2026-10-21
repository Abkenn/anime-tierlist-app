import { navigation } from 'next/cache';
import { ViewTransition } from 'react';
import { TierPreview } from '@/app/_components/home/tier-preview';
import type { HomePreviewProps } from '@/app/_types/home.types';
import { PreviewLink } from './preview-link';

export const HomePreview = async ({ searchParams }: HomePreviewProps) => {
  await navigation();
  const { preview } = await searchParams;
  const expanded = preview === 'tiers';

  return (
    <div>
      <PreviewLink expanded={expanded} />
      <div id="tier-preview">
        {expanded && (
          <ViewTransition
            default="none"
            enter="preview-change"
            exit="preview-change"
          >
            <TierPreview />
          </ViewTransition>
        )}
      </div>
    </div>
  );
};
