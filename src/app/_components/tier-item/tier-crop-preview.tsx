'use client';

import { motion } from 'motion/react';
import { type RefObject, useId } from 'react';
import { createPortal } from 'react-dom';
import { useTierCropOverlay } from '@/app/_hooks/use-tier-crop-overlay';
import { getTrimViewBox } from '@/app/_lib/tier-image-trim';
import type {
  TierCrop,
  TierImage,
  TierImageTrim,
} from '@/app/_types/tierlist.types';
import { TierItemImage } from './tier-item-image';

type TierCropPreviewProps = {
  image: TierImage;
  crop: TierCrop;
  trim?: TierImageTrim;
  anchor?: RefObject<HTMLElement | null>;
};

export const TierCropPreview = ({
  image,
  crop,
  trim,
  anchor,
}: TierCropPreviewProps) => {
  const maskId = useId();
  const { frame, selection } = useTierCropOverlay({
    anchor,
    image,
    crop,
    trim,
  });
  const ratio =
    image.width > 0 && image.height > 0 ? image.width / image.height : 1;
  const width = Math.max(1, ratio);
  const height = Math.max(1, 1 / ratio);

  if (anchor) {
    return (
      frame &&
      createPortal(
        <motion.svg
          aria-hidden="true"
          data-crop-preview=""
          data-crop-overlay=""
          viewBox={`0 0 ${image.width} ${image.height}`}
          className="pointer-events-none fixed left-0 top-0 z-40 overflow-visible brightness-40"
          initial={false}
          animate={{
            x: frame.x,
            y: frame.y,
            width: frame.width,
            height: frame.height,
          }}
          transition={{ duration: 0 }}
        >
          <title>Trimmed-out image preview</title>

          <defs>
            <mask
              id={maskId}
              maskUnits="userSpaceOnUse"
              x="0"
              y="0"
              width={image.width}
              height={image.height}
            >
              <rect width={image.width} height={image.height} fill="white" />

              <rect
                x={selection.left * image.width}
                y={selection.top * image.height}
                width={(selection.right - selection.left) * image.width}
                height={(selection.bottom - selection.top) * image.height}
                fill="black"
              />
            </mask>
          </defs>

          <image
            href={image.src}
            width={image.width}
            height={image.height}
            mask={`url(#${maskId})`}
          />
        </motion.svg>,
        document.body,
      )
    );
  }

  if (trim) {
    return (
      <svg
        aria-hidden="true"
        data-crop-preview=""
        viewBox={getTrimViewBox(image, trim)}
        className="pointer-events-none absolute inset-0 size-full overflow-visible brightness-40"
      >
        <title>Trimmed-out image preview</title>

        <image href={image.src} width={image.width} height={image.height} />
      </svg>
    );
  }

  return (
    <motion.span
      aria-hidden="true"
      data-crop-preview=""
      className="pointer-events-none absolute block brightness-40"
      initial={false}
      animate={{
        width: `${width * 100}%`,
        height: `${height * 100}%`,
        left: `${-(width - 1) * crop.x * 100}%`,
        top: `${-(height - 1) * crop.y * 100}%`,
      }}
      transition={{ duration: 0 }}
    >
      <TierItemImage image={image} mode="contain" crop={crop} />
    </motion.span>
  );
};
