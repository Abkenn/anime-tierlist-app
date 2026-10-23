import { type RefObject, useLayoutEffect, useState } from 'react';
import { getTierTrimFrame } from '@/app/_lib/tier-image-trim';
import type {
  TierCrop,
  TierImage,
  TierImageTrim,
} from '@/app/_types/tierlist.types';

type OverlayInput = {
  anchor?: RefObject<HTMLElement | null>;
  image: TierImage;
  crop: TierCrop;
  trim?: TierImageTrim;
};

export const useTierCropOverlay = ({
  anchor,
  image,
  crop,
  trim,
}: OverlayInput) => {
  const [frame, setFrame] = useState<ReturnType<
    typeof getTierTrimFrame
  > | null>(null);
  const ratio = image.width / image.height;
  const cropWidth = 1 / Math.max(1, ratio);
  const cropHeight = 1 / Math.max(1, 1 / ratio);
  const selection = trim ?? {
    left: (1 - cropWidth) * crop.x,
    top: (1 - cropHeight) * crop.y,
    right: (1 - cropWidth) * crop.x + cropWidth,
    bottom: (1 - cropHeight) * crop.y + cropHeight,
  };

  useLayoutEffect(() => {
    const element = anchor?.current;

    if (!element) {
      return;
    }

    const update = () => {
      const next = getTierTrimFrame({
        bounds: element.getBoundingClientRect(),
        image,
        trim: selection,
      });
      setFrame((current) =>
        current &&
        current.x === next.x &&
        current.y === next.y &&
        current.width === next.width &&
        current.height === next.height
          ? current
          : next,
      );
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    observer.observe(document.documentElement);
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [anchor, image, selection]);

  return { frame, selection };
};
