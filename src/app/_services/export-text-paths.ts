import 'server-only';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { create, type Font } from 'fontkit';
import { rankTextColor } from '@/app/_lib/rank-text-color';
import {
  exportPosterSize,
  exportTextLines,
  exportTitle,
  layoutExportBoard,
} from '@/app/_lib/tierlist-export-layout';
import type { TierlistDocument } from '@/app/_lib/tierlist-sync';

const fontPath = join(
  process.cwd(),
  'src/app/_assets/fonts/NotoSansCJKjp-Regular.otf',
);
let loadedFont: Promise<Font> | undefined;
const readExportFont = async () => {
  const data = await readFile(fontPath);
  const font = create(data);
  if (!('layout' in font)) {
    throw new Error('The export font must be a single font.');
  }

  return font;
};
const loadFont = () => {
  loadedFont ??= readExportFont();

  return loadedFont;
};

type TextLine = {
  text: string;
  x: number;
  y: number;
  size: number;
  width: number;
};
const linePaths = (font: Font, line: TextLine) => {
  const run = font.layout(line.text);
  const scale = line.size / font.unitsPerEm;
  const width = run.positions.reduce(
    (sum, position) => sum + position.xAdvance,
    0,
  );
  const scaleX = scale * Math.min(1, line.width / Math.max(1, width * scale));
  let x = line.x - (width * scaleX) / 2;

  return run.glyphs
    .map((glyph, index) => {
      const position = run.positions[index];
      const path = `<path d="${glyph.path.toSVG()}" vector-effect="non-scaling-stroke" transform="translate(${x + position.xOffset * scaleX} ${line.y - position.yOffset * scale}) scale(${scaleX} ${-scale})"/>`;
      x += position.xAdvance * scaleX;
      return path;
    })
    .join('');
};

export const renderExportTextPaths = async (document: TierlistDocument) => {
  const font = await loadFont();
  const board = layoutExportBoard(document);

  return board.rows
    .map((row, rowIndex) => {
      const lines = exportTextLines(row.label, exportPosterSize - 16, 20);
      const rank = lines
        .map((text, index) =>
          linePaths(font, {
            text,
            x: exportPosterSize / 2,
            y:
              row.y +
              exportPosterSize / 2 +
              (index - (lines.length - 1) / 2) * 25 +
              7,
            size: 20,
            width: exportPosterSize - 12,
          }),
        )
        .join('');
      const posters = row.posters
        .map((box, index) => {
          const title = exportTitle(box, document.imageMode);
          const fallback = box.item.image?.src
            ? ''
            : exportTextLines(
                box.item.label || 'Unavailable',
                box.width - 8,
                14,
              )
                .map((text, line) =>
                  linePaths(font, {
                    text,
                    x: box.x + box.width / 2,
                    y: box.y + 20 + line * 18,
                    size: 14,
                    width: box.width - 8,
                  }),
                )
                .join('');
          const titlePaths =
            title?.lines
              .map((text, line) =>
                linePaths(font, {
                  text,
                  x: title.x,
                  y: title.y + title.fontSize + line * title.fontSize * 1.25,
                  size: title.fontSize,
                  width: box.width - 8,
                }),
              )
              .join('') ?? '';

          return `<g clip-path="url(#poster-${rowIndex}-${index})"><g fill="#ededeb">${fallback}</g>${title ? `<g fill="${title.color}" stroke="${rankTextColor(title.color)}" stroke-width="1.5" paint-order="stroke" stroke-linejoin="round">${titlePaths}</g>` : ''}</g>`;
        })
        .join('');

      return `<g fill="${row.textColor}">${rank}</g>${posters}`;
    })
    .join('');
};
