import { cn } from 'cn';
import { motion } from 'motion/react';
import Image from 'next/image';
import { useState } from 'react';
import type {
  TierCrop,
  TierImage,
  TierImageMode,
} from '@/app/_types/tierlist.types';

const MotionImage = motion.create(Image);

type TierItemImageProps = {
  image: TierImage;
  mode: TierImageMode;
  crop: TierCrop;
};

export const TierItemImage = ({ image, mode, crop }: TierItemImageProps) => {
  const [failedSource, setFailedSource] = useState<string | null>(null);

  return failedSource === image.src ? (
    <span className="px-1 text-xs">{image.alt}</span>
  ) : (
    <MotionImage
      src={image.src}
      alt={image.alt}
      fill
      unoptimized
      draggable={false}
      sizes="(max-width: 64rem) 4rem, 8rem"
      className={cn(
        'pointer-events-none select-none',
        mode === 'cover' ? 'object-cover' : 'object-contain',
      )}
      animate={{
        objectPosition:
          mode === 'cover' ? `${crop.x * 100}% ${crop.y * 100}%` : '50% 50%',
      }}
      transition={{ duration: 0 }}
      onError={() => setFailedSource(image.src)}
    />
  );
};
