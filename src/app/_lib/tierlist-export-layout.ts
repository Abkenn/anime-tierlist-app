import type {
  HexColor,
  TierColor,
  TierItemData,
} from '@/app/_types/tierlist.types';
import { rankTextColor } from './rank-text-color';
import { tierColors } from './tier-colors';
import { fullImageTrim } from './tier-image-trim';
import { getTierItemSize } from './tier-item-layout';
import { getTierTitleLayout } from './tier-title-layout';
import type { TierlistDocument } from './tierlist-sync';

export const exportPosterSize = 160;
const palette: Record<TierColor, HexColor> = {
  orchid: '#e68ee6',
  rose: '#e68e96',
  salmon: '#e6a08e',
  apricot: '#e6b88e',
  gold: '#e6ce8e',
  yellow: '#e6e68e',
  citron: '#d6e68e',
  chartreuse: '#c0e68e',
  lime: '#a9e68e',
  leaf: '#93e68e',
  mint: '#8ee6a0',
  jade: '#8ee6b8',
  seafoam: '#8ee6ce',
  aqua: '#8ee6e6',
  sky: '#8ecee6',
  azure: '#8eb8e6',
  periwinkle: '#8ea0e6',
  lavender: '#a08ee6',
  wisteria: '#a39bdf',
  stone: '#aaa9a5',
};

export const layoutExportBoard = (document: TierlistDocument) => {
  const grouped = new Map(
    document.ranks.map((rank) => [rank, [] as TierItemData[]]),
  );
  document.items.forEach((item) => {
    grouped.get(item.rank)?.push(item);
  });
  const rows = document.ranks.map((rank, index) => {
    let x = exportPosterSize + 2;
    const posters = (grouped.get(rank) ?? []).map((item) => {
      const size = getTierItemSize({
        item,
        size: exportPosterSize - 4,
        mode: document.imageMode,
      });
      const box = {
        item,
        x,
        y: index * exportPosterSize + (exportPosterSize - size.height) / 2,
        ...size,
      };
      x += size.width + 2;

      return box;
    });
    const color =
      document.rankDetails?.[rank]?.color ??
      palette[tierColors[rank]] ??
      '#aaaaaa';

    return {
      rank,
      label: document.rankDetails?.[rank]?.label ?? rank,
      color,
      textColor: rankTextColor(color),
      y: index * exportPosterSize,
      end: x,
      posters,
    };
  });
  const posters = rows.flatMap((row) => row.posters);
  const averageWidth = posters.length
    ? posters.reduce((sum, poster) => sum + poster.width, 0) / posters.length
    : exportPosterSize;

  return {
    width: Math.ceil(
      Math.max(exportPosterSize + 2, ...rows.map((row) => row.end)) +
        averageWidth,
    ),
    height: rows.length * exportPosterSize,
    rows,
  };
};

export type ExportRow = ReturnType<typeof layoutExportBoard>['rows'][number];

export type ExportPoster = ReturnType<
  typeof layoutExportBoard
>['rows'][number]['posters'][number];

export const exportImageFrame = (
  box: ExportPoster,
  mode: TierlistDocument['imageMode'],
) => {
  const image = box.item.image;
  if (!image) {
    return null;
  }
  const trim =
    mode === 'natural' ? (box.item.trim ?? fullImageTrim) : fullImageTrim;
  const source = {
    x: trim.left * image.width,
    y: trim.top * image.height,
    width: (trim.right - trim.left) * image.width,
    height: (trim.bottom - trim.top) * image.height,
  };
  const scale = (mode === 'cover' ? Math.max : Math.min)(
    box.width / source.width,
    box.height / source.height,
  );
  const width = source.width * scale;
  const height = source.height * scale;
  const crop =
    mode === 'cover'
      ? (box.item.crop ?? { x: 0.5, y: 0.5 })
      : { x: 0.5, y: 0.5 };

  return {
    source,
    x: box.x + (box.width - width) * crop.x,
    y: box.y + (box.height - height) * crop.y,
    width,
    height,
  };
};

export const exportTextLines = (
  text: string,
  width: number,
  fontSize: number,
  wrap = true,
) => {
  const capacity = Math.max(1, Math.floor(width / (fontSize * 0.62)));

  return text
    .split('\n')
    .flatMap((line) => {
      if (!wrap) {
        return [line];
      }
      const lines: string[] = [];
      let current = '';
      Array.from(line).forEach((character) => {
        if (current.length >= capacity) {
          lines.push(current.trimEnd());
          current = '';
        }
        current += character;
      });
      lines.push(current);

      return lines;
    })
    .slice(0, 4);
};

export const exportTitle = (
  box: ExportPoster,
  mode: TierlistDocument['imageMode'],
) => {
  const title = box.item.title;
  if (!title?.text) {
    return null;
  }
  const image = exportImageFrame(box, mode);
  const frame = mode === 'contain' && image ? image : box;
  const { fontSize, lines } = getTierTitleLayout(
    title,
    frame.width,
    frame.height,
  );
  const height = lines.length * fontSize * 1.25;
  const y = {
    top: frame.y + 6,
    bottom: frame.y + frame.height - height - 6,
    middle: frame.y + (frame.height - height) / 2,
  }[title.position];

  return {
    lines,
    fontSize,
    x: frame.x + frame.width / 2,
    y,
    color: title.color,
  };
};

export const exportCanvasSize = (width: number, height: number) => {
  const scale = Math.min(
    2,
    16384 / width,
    16384 / height,
    Math.sqrt(16_000_000 / (width * height)),
  );

  return {
    scale,
    width: Math.max(1, Math.floor(width * scale)),
    height: Math.max(1, Math.floor(height * scale)),
  };
};
