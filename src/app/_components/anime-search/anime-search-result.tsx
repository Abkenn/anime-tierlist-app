'use client';

import { motion } from 'motion/react';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSearchItemDrag } from '@/app/_hooks/use-search-item-drag';
import type { AnimeSearchResult } from '@/app/_types/anime-search.types';
import type { TierImage } from '@/app/_types/tierlist.types';

type AnimeSearchResultProps = {
  result: AnimeSearchResult;
  onLoaded: (id: string, image: TierImage) => void;
};

export const AnimeSearchResultCard = ({
  result,
  onLoaded,
}: AnimeSearchResultProps) => {
  type ImageState =
    | { status: 'loading' }
    | { status: 'ready'; image: TierImage }
    | { status: 'error' };
  const [state, setState] = useState<ImageState>(
    result.image
      ? { status: 'ready', image: result.image }
      : { status: 'loading' },
  );
  const image = state.status === 'ready' ? state.image : undefined;
  const drag = useSearchItemDrag({
    id: result.id,
    label: result.title,
    rank: 'Watching',
    image,
  });

  useEffect(() => {
    if (state.status !== 'loading') {
      return;
    }
    const timer = setTimeout(
      () =>
        setState((current) =>
          current.status === 'loading' ? { status: 'error' } : current,
        ),
      15000,
    );

    return () => clearTimeout(timer);
  }, [state.status]);

  return (
    <>
      <motion.button
        type="button"
        disabled={!image}
        title={`${result.title} · Drag to a rank or click to add to Watching`}
        className="relative block w-full touch-none cursor-grab overflow-hidden text-xs transition-opacity hover:opacity-80 active:cursor-grabbing disabled:cursor-default disabled:opacity-60"
        drag={Boolean(image)}
        dragSnapToOrigin
        dragMomentum={false}
        dragElastic={0}
        {...drag.triggerProps}
        animate={{ opacity: drag.dragging ? 0 : 1 }}
      >
        {state.status === 'error' ? (
          <span role="status">
            Image could not be loaded. Check the URL or try another image.
          </span>
        ) : (
          <Image
            draggable={false}
            unoptimized
            src={result.imageUrl}
            alt={result.title}
            width={image?.width ?? 160}
            height={image?.height ?? 240}
            className="mx-auto block size-auto max-h-24 max-w-full"
            onLoad={(event) => {
              const element = event.currentTarget;
              const loaded = {
                src: result.imageUrl,
                width: element.naturalWidth,
                height: element.naturalHeight,
                alt: result.title,
              };
              setState({ status: 'ready', image: loaded });
              onLoaded(result.id, loaded);
            }}
            onError={() => setState({ status: 'error' })}
          />
        )}
      </motion.button>

      {drag.dragging &&
        image &&
        createPortal(
          <motion.div
            aria-hidden="true"
            className="pointer-events-none fixed left-0 top-0 z-50"
            initial={drag.initialPreview}
            animate={drag.preview}
            transition={{ duration: 0 }}
          >
            <Image
              unoptimized
              src={image.src}
              alt=""
              width={image.width}
              height={image.height}
              className="size-full object-contain"
              draggable={false}
            />
          </motion.div>,
          document.body,
        )}
    </>
  );
};
