'use client';

import { useAtomValue } from 'jotai';
import { ImageOff } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import Image from 'next/image';
import { useEffect, useEffectEvent, useState } from 'react';
import { createPortal } from 'react-dom';
import { searchDestinationAtom } from '@/app/_atoms/tierlist/search.atoms';
import { TerminalText } from '@/app/_components/shell/terminal-text';
import { useSearchItemDrag } from '@/app/_hooks/use-search-item-drag';
import { posterCrossOrigin } from '@/app/_lib/poster-cross-origin';
import type { AnimeSearchResult } from '@/app/_types/anime-search.types';
import type { TierImage } from '@/app/_types/tierlist.types';

type AnimeSearchResultProps = {
  result: AnimeSearchResult;
  onLoaded: (id: string, image: TierImage | null) => void;
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
  const reducedMotion = useReducedMotion();
  const destination = useAtomValue(searchDestinationAtom);
  const image = state.status === 'ready' ? state.image : undefined;
  const drag = useSearchItemDrag({
    id: result.id,
    label: result.title,
    rank: destination.rank,
    image,
  });

  const reportFailure = useEffectEvent(() => onLoaded(result.id, null));

  useEffect(() => {
    if (state.status === 'error') {
      reportFailure();
    }

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
      <div
        className="relative max-w-full"
        style={{
          width: image ? `${(image.width / image.height) * 6}rem` : '100%',
        }}
      >
        <motion.button
          type="button"
          disabled={!image}
          title={`${result.title} · Drag to a rank or click to add to ${destination.label}`}
          className="relative block w-full touch-none cursor-grab overflow-hidden text-xs transition-opacity hover:opacity-80 active:cursor-grabbing disabled:cursor-default disabled:opacity-60"
          drag={Boolean(image)}
          dragSnapToOrigin
          dragMomentum={false}
          dragElastic={0}
          {...drag.triggerProps}
          animate={{ opacity: drag.dragging ? 0 : 1 }}
        >
          {state.status === 'loading' && (
            <motion.span
              aria-hidden="true"
              initial={{ opacity: 0.5 }}
              animate={{ opacity: reducedMotion ? 0.7 : [0.5, 0.85, 0.5] }}
              transition={{
                duration: 1.4,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="absolute inset-0 flex min-h-16 items-center justify-center bg-muted text-[0.625rem] text-muted-foreground"
            >
              <TerminalText text="Loading..." />
            </motion.span>
          )}

          {state.status === 'error' ? (
            <span
              role="img"
              aria-label={`${result.title}: image unavailable`}
              className="mx-auto flex h-24 w-16 flex-col items-center justify-center gap-2 border border-divider bg-muted text-muted-foreground"
            >
              <ImageOff aria-hidden="true" className="size-5" />
              <span className="text-[0.625rem]">Unavailable</span>
            </span>
          ) : (
            <Image
              draggable={false}
              loading="eager"
              unoptimized
              src={result.imageUrl}
              crossOrigin={posterCrossOrigin(result.imageUrl)}
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

        {image && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 lg:hidden"
          >
            {[
              'inset-x-0 top-0 h-0.5',
              'inset-x-0 bottom-0 h-0.5',
              'inset-y-0 left-0 w-0.5',
              'inset-y-0 right-0 w-0.5',
            ].map((edge) => (
              <span
                key={edge}
                data-search-scroll-edge=""
                className={`pointer-events-auto absolute touch-pan-y ${edge}`}
              />
            ))}
          </div>
        )}
      </div>

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
              crossOrigin={posterCrossOrigin(image.src)}
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
