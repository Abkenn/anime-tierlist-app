'use client';

import { motion } from 'motion/react';
import type { TierCrop, TierImage } from '@/app/_types/tierlist.types';
import { TierItemImage } from './tier-item-image';

type TierCropPreviewProps = {
  image: TierImage;
  crop: TierCrop;
};

export const TierCropPreview = ({ image, crop }: TierCropPreviewProps) => {
  const ratio =
    image.width > 0 && image.height > 0 ? image.width / image.height : 1;
  const width = Math.max(1, ratio);
  const height = Math.max(1, 1 / ratio);

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
