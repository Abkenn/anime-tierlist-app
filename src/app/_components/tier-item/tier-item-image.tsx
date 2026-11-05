'use client';

import { cn } from 'cn';
import { motion } from 'motion/react';
import Image from 'next/image';
import { useEffect, useEffectEvent, useState } from 'react';
import { preconnect } from 'react-dom';
import { posterCrossOrigin } from '@/app/_lib/poster-cross-origin';
import { posterDisplaySource } from '@/app/_lib/poster-display-source';
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
  const source = posterDisplaySource(image.src);
  const notifyReady = useEffectEvent(() => onReady?.());

  useEffect(() => {
    if (mode !== 'natural') {
      return;
    }
    // SVG load events can precede React's commit during a cached/concurrent
    // remount. An HTML image also exposes synchronous cache readiness.
    let active = true;
    let settled = false;
    const resource = new window.Image();
    const ready = () => {
      if (!active || settled) {
        return;
      }
      settled = true;
      setLoadedSource(image.src);
      notifyReady();
    };
    resource.onload = ready;
    resource.onerror = () => {
      if (active) {
        setFailedSource(image.src);
      }
    };
    const crossOrigin = posterCrossOrigin(image.src);
    if (crossOrigin) {
      resource.crossOrigin = crossOrigin;
    }
    resource.src = source;
    if (resource.complete && resource.naturalWidth > 0) {
      ready();
    }
    return () => {
      active = false;
      resource.onload = null;
      resource.onerror = null;
    };
  }, [image.src, mode, source]);

  const placeholderClass = cn(
    'relative block size-full',
    loading && showPlaceholder && 'bg-muted',
  );

  if (priority) {
    if (posterCrossOrigin(image.src)) {
      preconnect('https://cdn.myanimelist.net', { crossOrigin: 'anonymous' });
    }
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
            href={source}
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
        src={source}
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
