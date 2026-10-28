import { z } from 'zod';
import { rankTextColor } from '@/app/_lib/rank-text-color';
import {
  exportCanvasSize,
  exportImageFrame,
  exportPosterSize,
  exportTextLines,
  exportTitle,
  layoutExportBoard,
} from '@/app/_lib/tierlist-export-layout';
import {
  type TierlistDocument,
  userSeedSchema,
} from '@/app/_lib/tierlist-sync';
import { posterCacheName } from './poster-cache';
import { resolvePosterTitleColor } from './poster-title-color';

const projectSchema = z.object({
  format: z.literal('anime-tierlist'),
  version: z.literal(1),
  seed: userSeedSchema,
});

export const readTierlistProject = async (file: File) => {
  if (file.size > 4096) {
    throw new Error('Choose a valid .anime project file.');
  }
  const parsed = projectSchema.safeParse(JSON.parse(await file.text()));
  if (!parsed.success) {
    throw new Error('Choose a valid .anime project file.');
  }

  return parsed.data.seed;
};

export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

export const downloadTierlistProject = (seed: string) => {
  const project = projectSchema.parse({
    format: 'anime-tierlist',
    version: 1,
    seed,
  });
  downloadBlob(
    new Blob([JSON.stringify(project)], { type: 'application/json' }),
    'tierlist.anime',
  );
};

const loadExportImage = async (source: string) => {
  let objectUrl: string | undefined;
  try {
    if ('caches' in window) {
      const cached = await (await caches.open(posterCacheName)).match(source, {
        ignoreVary: true,
      });
      if (cached?.ok && cached.type !== 'opaque') {
        objectUrl = URL.createObjectURL(await cached.blob());
      }
    }
  } catch {
    // Storage may be unavailable; anonymous image loading still works online.
  }
  const image = new Image();
  image.crossOrigin = 'anonymous';
  const { promise, resolve, reject } =
    Promise.withResolvers<HTMLImageElement>();
  const timer = setTimeout(() => {
    image.src = '';
    reject(new Error('Poster timed out.'));
  }, 12_000);
  image.onload = () => resolve(image);
  image.onerror = () => reject(new Error('Poster unavailable for export.'));
  image.src = objectUrl ?? source;

  try {
    return await promise;
  } finally {
    clearTimeout(timer);
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }
  }
};

export const downloadTierlistPng = async (data: TierlistDocument) => {
  const board = layoutExportBoard(data);
  const output = exportCanvasSize(board.width, board.height);
  const canvas = document.createElement('canvas');
  canvas.width = output.width;
  canvas.height = output.height;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Image export is unavailable in this browser.');
  }
  context.scale(output.scale, output.scale);
  context.imageSmoothingQuality = 'high';
  context.fillStyle = '#1c1c1c';
  context.fillRect(0, 0, board.width, board.height);
  context.textAlign = 'center';
  board.rows.forEach((row) => {
    context.fillStyle = row.color;
    context.fillRect(0, row.y, exportPosterSize, exportPosterSize);
    context.fillStyle = '#111111';
    context.fillRect(0, row.y, board.width, 1);
    context.fillStyle = row.textColor;
    context.font = '20px monospace';
    const lines = exportTextLines(row.label, exportPosterSize - 16, 20);
    lines.forEach((line, index) => {
      context.fillText(
        line,
        exportPosterSize / 2,
        row.y +
          exportPosterSize / 2 +
          (index - (lines.length - 1) / 2) * 25 +
          7,
        exportPosterSize - 12,
      );
    });
  });
  const posters = board.rows.flatMap((row) => row.posters);
  let next = 0;
  let unavailable = 0;
  const worker = async () => {
    while (next < posters.length) {
      const box = posters[next++];
      const frame = exportImageFrame(box, data.imageMode);
      let image: HTMLImageElement | undefined;
      if (frame && box.item.image) {
        try {
          image = await loadExportImage(box.item.image.src);
        } catch {
          unavailable += 1;
        }
      }
      context.save();
      context.beginPath();
      context.rect(box.x, box.y, box.width, box.height);
      context.clip();
      if (image && frame && box.item.image) {
        const sx = image.naturalWidth / box.item.image.width;
        const sy = image.naturalHeight / box.item.image.height;
        context.drawImage(
          image,
          frame.source.x * sx,
          frame.source.y * sy,
          frame.source.width * sx,
          frame.source.height * sy,
          frame.x,
          frame.y,
          frame.width,
          frame.height,
        );
      } else {
        context.fillStyle = '#ededeb';
        context.font = '14px monospace';
        exportTextLines(
          box.item.label || 'Unavailable',
          box.width - 8,
          14,
        ).forEach((line, index) => {
          context.fillText(
            line,
            box.x + box.width / 2,
            box.y + 20 + index * 18,
          );
        });
      }
      const title = exportTitle(box, data.imageMode);
      if (title) {
        context.font = `600 ${title.fontSize}px sans-serif`;
        const color = await resolvePosterTitleColor(box.item, data.imageMode);
        context.fillStyle = color;
        context.strokeStyle = rankTextColor(color);
        context.lineWidth = 1.5;
        title.lines.forEach((line, index) => {
          const y = title.y + title.fontSize + index * title.fontSize * 1.25;
          context.strokeText(line, title.x, y);
          context.fillText(line, title.x, y);
        });
      }
      context.restore();
      if (image) {
        image.src = '';
      }
      // Yield between posters so large exports do not block editing or touch input.
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
  };

  try {
    await Promise.all(
      Array.from({ length: Math.min(6, posters.length) }, worker),
    );
    const { promise, resolve, reject } = Promise.withResolvers<Blob>();
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(
              new Error('This tierlist is too large to export on this device.'),
            ),
      'image/png',
    );
    downloadBlob(await promise, 'tierlist.png');

    return unavailable;
  } finally {
    canvas.width = 0;
    canvas.height = 0;
  }
};
