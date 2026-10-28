import ky from 'ky';
import type { PosterPreview } from '@/app/_atoms/tierlist/poster-preview.atoms';
import { layoutExportBoard } from './tierlist-export-layout';
import type { TierlistDocument } from './tierlist-sync';

// This fallback only bridges a client navigation, never replaces saved posters.
let current:
  | {
      src: string;
      seed: string;
      revision: number;
      previews: ReadonlyMap<string, PosterPreview>;
    }
  | undefined;

export const previewHandoffEvent = 'tierlist-preview-handoff-ready';

export const savePreviewHandoff = async (
  document: TierlistDocument,
  seed: string,
  revision: number,
  id: string,
) => {
  let src: string;
  try {
    const png = await ky
      .get(`/api/tierlist-preview/${id}/image`, { retry: 0, timeout: 20_000 })
      .blob();
    if (current) {
      URL.revokeObjectURL(current.src);
    }
    src = URL.createObjectURL(png);
  } catch {
    return;
  }
  const board = layoutExportBoard(document);
  const previews = board.rows.flatMap((row) =>
    row.posters.flatMap((box): [string, PosterPreview][] =>
      box.item.image
        ? [
            [
              box.item.image.src,
              {
                src,
                width: board.width,
                height: board.height,
                viewBox: `${box.x} ${box.y} ${box.width} ${box.height}`,
              },
            ],
          ]
        : [],
    ),
  );
  current = { src, seed, revision, previews: new Map(previews) };
  window.dispatchEvent(new Event(previewHandoffEvent));
};

export const readPreviewHandoff = (
  seed: string,
  revision: number,
): ReadonlyMap<string, PosterPreview> =>
  current?.seed === seed && current.revision === revision
    ? current.previews
    : new Map();
