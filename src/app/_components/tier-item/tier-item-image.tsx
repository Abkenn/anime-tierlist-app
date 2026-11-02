'use client';

import { cn } from 'cn';
import { motion } from 'motion/react';
import Image from 'next/image';
import { useState } from 'react';
import { preconnect, preload } from 'react-dom';
import { posterCrossOrigin } from '@/app/_lib/poster-cross-origin';
import { fullImageTrim, getTrimViewBox } from '@/app/_lib/tier-image-trim';
import type {
  TierCrop,
  TierImage,
  TierImageMode,
  TierImageTrim,
} from '@/app/_types/tierlist.types';

const MotionImage = motion.create(Image);

type TierItemImageProps = {
  image: TierImage;
  mode: TierImageMode;
  crop: TierCrop;
  trim?: TierImageTrim;
  priority?: boolean;
  onReady?: () => void;
  showPlaceholder?: boolean;
};

export const TierItemImage = ({
  image,
  mode,
  crop,
  trim = fullImageTrim,
  priority = false,
  onReady,
  showPlaceholder = true,
}: TierItemImageProps) => {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const [loadedSource, setLoadedSource] = useState<string | null>(null);
  const loading = loadedSource !== image.src;
  const placeholderClass = cn(
    'relative block size-full',
    loading && showPlaceholder && 'bg-muted',
  );

  if (priority) {
    if (posterCrossOrigin(image.src)) {
      preconnect('https://cdn.myanimelist.net', { crossOrigin: 'anonymous' });
    }
    preload(image.src, {
      as: 'image',
      fetchPriority: 'high',
      crossOrigin: posterCrossOrigin(image.src),
    });
  }

  const loaded = () => {
    setLoadedSource(image.src);
    onReady?.();
  };
  const failed = () => {
    setFailedSource(image.src);
  };

  if (failedSource === image.src) {
    return <span className="px-1 text-xs">{image.alt}</span>;
  }

  if (mode === 'natural') {
    return (
      <span className={placeholderClass} aria-busy={loading}>
        <svg
          viewBox={getTrimViewBox(image, trim)}
          className={cn(
            'pointer-events-none size-full overflow-hidden object-contain select-none',
            loading && 'invisible',
          )}
          role="img"
          aria-label={image.alt}
        >
          <title>{image.alt}</title>

          <image
            href={image.src}
            crossOrigin={posterCrossOrigin(image.src)}
            width={image.width}
            height={image.height}
            {...(priority ? { fetchPriority: 'high' } : {})}
            onError={failed}
            onLoad={loaded}
          />
        </svg>
      </span>
    );
  }

  return (
    <span className={placeholderClass} aria-busy={loading}>
      <MotionImage
        src={image.src}
        crossOrigin={posterCrossOrigin(image.src)}
        alt={image.alt}
        fill
        unoptimized
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : undefined}
        draggable={false}
        sizes="(max-width: 64rem) 4rem, 8rem"
        className={cn(
          'pointer-events-none select-none',
          mode === 'cover' ? 'object-cover' : 'object-contain',
          loading && 'invisible',
        )}
        animate={{
          objectPosition:
            mode === 'cover' ? `${crop.x * 100}% ${crop.y * 100}%` : '50% 50%',
        }}
        transition={{ duration: 0 }}
        onError={failed}
        onLoad={loaded}
      />
    </span>
  );
};
