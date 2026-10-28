import {
  type ExportPoster,
  type ExportRow,
  exportPosterSize,
} from './tierlist-export-layout';

export type PreviewSlot = { rank: string; index: number };
export type PreviewSpriteBox = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  targetX: number;
  targetY: number;
};

export const previewDropSlot = (
  rows: ExportRow[],
  from: ExportPoster,
  x: number,
  y: number,
): PreviewSlot => {
  const row = rows.find((row) => y >= row.y && y < row.y + exportPosterSize);
  if (!row) {
    const original = rows.find((row) => row.rank === from.item.rank);
    return {
      rank: from.item.rank,
      index: original?.posters.indexOf(from) ?? 0,
    };
  }
  const siblings = row.posters.filter((poster) => poster !== from);
  const index = siblings.findIndex((poster) => x < poster.x + poster.width / 2);

  return { rank: row.rank, index: index < 0 ? siblings.length : index };
};

export const previewPosterSprites = (
  rows: ExportRow[],
  from: ExportPoster,
  slot: PreviewSlot,
  visitedRanks: string[] = [from.item.rank, slot.rank],
): PreviewSpriteBox[] => {
  return rows
    .filter((row) => visitedRanks.includes(row.rank))
    .flatMap((row) => {
      const posters = row.posters.filter((poster) => poster !== from);
      if (row.rank === slot.rank) {
        posters.splice(slot.index, 0, from);
      }
      let x = exportPosterSize + 2;

      return posters.map((poster) => {
        const targetX = x;
        x += poster.width + 2;

        return {
          id: poster.item.id,
          x: poster.x,
          y: poster.y,
          width: poster.width,
          height: poster.height,
          targetX,
          targetY: row.y + (exportPosterSize - poster.height) / 2,
        };
      });
    });
};
