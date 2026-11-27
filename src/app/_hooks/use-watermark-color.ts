'use client';

import { useEffect, useState } from 'react';
import { previewWatermark as mark } from '@/app/_lib/preview-watermark';
import type { ExportRow } from '@/app/_lib/tierlist-export-layout';
import { boardWatermarkColor, watermarkPosters } from '@/app/_lib/watermark-contrast';
import { readPosterPixels } from '@/app/_services/poster-title-color';
import type { HexColor, TierImageMode } from '@/app/_types/tierlist.types';

export const useWatermarkColor = (rows: ExportRow[], height: number, mode: TierImageMode) => {
  const [result, setResult] = useState<{
    rows: ExportRow[];
    height: number;
    mode: TierImageMode;
    color: HexColor;
  }>();

  useEffect(() => {
    let active = true;

    const resolve = async () => {
      const board = { rows, height, mode };
      const samples = new Map<string, ArrayLike<number>>();
      await Promise.all(
        watermarkPosters(board).map(async ({ item }) => {
          if (item.image) {
            const pixels = await readPosterPixels(item.image.src);
            if (pixels) {
              samples.set(item.image.src, pixels);
            }
          }
        }),
      );
      if (active) {
        setResult({ rows, height, mode, color: boardWatermarkColor(board, samples) });
      }
    };

    void resolve();

    return () => {
      active = false;
    };
  }, [rows, height, mode]);

  return result?.rows === rows && result.height === height && result.mode === mode
    ? result.color
    : mark.color;
};
