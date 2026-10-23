import { useLayoutEffect, useRef, useState } from 'react';
import { getTrimmedImage } from '@/app/_lib/tier-image-trim';
import type {
  TierImage,
  TierImageMode,
  TierImageTrim,
} from '@/app/_types/tierlist.types';

type TitleFrameInput = {
  image?: TierImage;
  mode: TierImageMode;
  trim?: TierImageTrim;
};

export const useTierTitleFrame = ({ image, mode, trim }: TitleFrameInput) => {
  const ref = useRef<HTMLSpanElement>(null);
  const [bounds, setBounds] = useState({ width: 0, height: 0 });
  const source =
    image && (mode === 'natural' ? getTrimmedImage(image, trim) : image);
  const scale =
    source && bounds.width && bounds.height
      ? Math.min(bounds.width / source.width, bounds.height / source.height)
      : 1;
  const fitted = source && mode !== 'cover' && bounds.width && bounds.height;
  const frame = {
    width: fitted
      ? `${((source.width * scale) / bounds.width) * 100}%`
      : '100%',
    height: fitted
      ? `${((source.height * scale) / bounds.height) * 100}%`
      : '100%',
  };

  useLayoutEffect(() => {
    const element = ref.current;

    if (!element) {
      return;
    }

    const update = () => {
      const { width, height } = element.getBoundingClientRect();
      setBounds((current) =>
        current.width === width && current.height === height
          ? current
          : { width, height },
      );
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return { ref, frame };
};
