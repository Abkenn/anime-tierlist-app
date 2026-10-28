'use client';

import { posterCrossOrigin } from '@/app/_lib/poster-cross-origin';
import { usesAutomaticTitleColor } from '@/app/_lib/tier-item-title';
import {
  contrastingTitleColor,
  titleSampleSize,
} from '@/app/_lib/title-contrast';
import type {
  HexColor,
  TierImageMode,
  TierItemData,
} from '@/app/_types/tierlist.types';

const samples = new Map<string, Promise<Uint8ClampedArray | null>>();

const readPixels = (source: string) => {
  const existing = samples.get(source);
  if (existing) {
    return existing;
  }
  const task = new Promise<Uint8ClampedArray | null>((resolve) => {
    const image = new Image();
    const crossOrigin = posterCrossOrigin(source);
    if (crossOrigin) {
      image.crossOrigin = crossOrigin;
    }
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = titleSampleSize;
        canvas.height = titleSampleSize;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) {
          resolve(null);
          return;
        }
        context.drawImage(image, 0, 0, titleSampleSize, titleSampleSize);
        resolve(
          context.getImageData(0, 0, titleSampleSize, titleSampleSize).data,
        );
      } catch {
        resolve(null);
      }
    };
    image.onerror = () => resolve(null);
    image.src = source;
  });
  samples.set(source, task);
  if (samples.size > 128) {
    const oldest = samples.keys().next().value;
    if (oldest) {
      samples.delete(oldest);
    }
  }

  return task;
};

export const resolvePosterTitleColor = async (
  item: TierItemData,
  mode: TierImageMode,
): Promise<HexColor> => {
  const fallback = item.title?.color ?? '#ffffff';
  if (!item.title || !usesAutomaticTitleColor(item.title) || !item.image) {
    return fallback;
  }
  const pixels = await readPixels(item.image.src);

  return pixels ? contrastingTitleColor(pixels, item, mode) : fallback;
};
