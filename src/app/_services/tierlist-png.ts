import 'server-only';
import { prerender } from 'react-dom/static';
import sharp from 'sharp';
import { TierlistPreviewBoard } from '@/app/_components/sharing/tierlist-preview-board';
import { usesAutomaticTitleColor } from '@/app/_lib/tier-item-title';
import {
  exportCanvasSize,
  layoutExportBoard,
} from '@/app/_lib/tierlist-export-layout';
import type { TierlistDocument } from '@/app/_lib/tierlist-sync';
import {
  contrastingTitleColor,
  titleSampleSize,
} from '@/app/_lib/title-contrast';
import { embedExportPoster } from './export-poster';
import { renderExportTextPaths } from './export-text-paths';

export const renderTierlistPng = async (document: TierlistDocument) => {
  const sources = [
    ...new Set(
      document.items.flatMap((item) => (item.image ? [item.image.src] : [])),
    ),
  ];
  const embedded = new Map<string, string>();
  const samples = new Map<string, Buffer>();
  const automaticSources = new Set(
    document.items.flatMap((item) =>
      item.title && usesAutomaticTitleColor(item.title) && item.image
        ? [item.image.src]
        : [],
    ),
  );
  let next = 0;
  const worker = async () => {
    while (next < sources.length) {
      const source = sources[next++];
      try {
        const poster = await embedExportPoster(source);
        embedded.set(source, poster);
        if (automaticSources.has(source)) {
          samples.set(
            source,
            await sharp(Buffer.from(poster.split(',')[1], 'base64'))
              .resize(titleSampleSize, titleSampleSize, { fit: 'fill' })
              .ensureAlpha()
              .raw()
              .toBuffer(),
          );
        }
      } catch {
        // Unavailable posters retain their labels, matching the client export fallback.
        embedded.set(source, '');
      }
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(8, sources.length) }, worker),
  );
  const printable: TierlistDocument = {
    ...document,
    items: document.items.map((item) => {
      const source = item.image ? (embedded.get(item.image.src) ?? '') : '';
      let title = item.title;
      const pixels = item.image && samples.get(item.image.src);
      if (title && usesAutomaticTitleColor(title) && pixels) {
        title = {
          ...title,
          color: contrastingTitleColor(pixels, item, document.imageMode),
        };
      }
      return {
        ...item,
        title,
        image: item.image ? { ...item.image, src: source } : undefined,
      };
    }),
  };
  const element = TierlistPreviewBoard({ document: printable });
  const { prelude } = await prerender(element);
  const markup = await new Response(prelude).text();
  const outlines = await renderExportTextPaths(printable);
  const withoutText = markup.replace(/<text\b[^>]*>[\s\S]*?<\/text>/gu, '');
  const end = withoutText.lastIndexOf('</svg>');
  const svg = `${withoutText.slice(0, end)}${outlines}</svg>`;
  const board = layoutExportBoard(document);
  const output = exportCanvasSize(board.width, board.height);

  const input = Buffer.from(
    svg
      .replace(/(<svg[^>]*?)width="[^"]*"/u, `$1width="${output.width}"`)
      .replace(/(<svg[^>]*?)height="[^"]*"/u, `$1height="${output.height}"`),
  );
  let width = output.width;
  let height = output.height;
  let png: Buffer;
  do {
    png = await sharp(input)
      .resize(width, height)
      .png({ palette: true, quality: 90, effort: 7 })
      .toBuffer();
    width = Math.max(1, Math.floor(width * 0.8));
    height = Math.max(1, Math.floor(height * 0.8));
  } while (png.length > 2_500_000);

  return png;
};
